from flask import Blueprint, request, make_response, redirect, url_for, render_template
import argon2
from flask_login import login_required
from wtforms import (
    BooleanField,
    StringField,
    RadioField,
    SearchField,
    PasswordField,
    validators,
    SubmitField,
    FileField,
)
import datetime
from gtfs_rt_server import db,  socketio, has_roles, has_any_role, redis , global_app
from gtfs_rt_server.make_gtfs import generate_gtfs_zip, add_gtfs_tables_to_db, has_errors
from threading import Thread, Lock
from gtfs_rt_server.db_utils import check_feed_password
from gtfs_rt_server.redis_utils import publish_event, publish_kill,listen_to_redis_pubsub 
from flask import current_app, send_file
from flask_socketio import join_room
from tempfile import NamedTemporaryFile, SpooledTemporaryFile
import os
from apscheduler.events import EVENT_JOB_REMOVED
from uuid import uuid4
from celery import shared_task
from pathlib import Path

gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")

from celery import current_task, Task
from time import sleep

@shared_task
def listen_to_room(channel,room):
    lock =  redis.lock(f"lock:{channel}", timeout=60*60)
    aquired = lock.acquire(blocking=False)
    if aquired: 
        listen_to_redis_pubsub(socketio,channel, room)
    else:
        return 0
    return 1

@shared_task
def generate_gtfs_from_xlsx(channel,excel_file_path):
    print("stating generate gtfs xlsx task")
    # use this method as a helper to update the tasks metainfo to contain status and messages
    def send_status_to_task(status="working", message=None, **kwargs):
        publish_event(channel,"event", {"status":status, "message":message, **kwargs})

    ## create temp file to store zip
    named_temp_zip = NamedTemporaryFile(mode="w+b")
    validation_report = False
    errors = []
    try:

        send_status_to_task(status="working", message="Starting ...")
        result_path =global_app.config["GTFS_VALIDATOR_RESULT_PATH"]
        df_dict = generate_gtfs_zip(
            excel_file_path,
            named_temp_zip.name,
            global_app.config["GTFS_VALIDATOR_PATH"],
            result_path,
            send_status_to_task,
            errors
        )
        ## read notices in report.json to find errors or warnings
        if errors:
            send_status_to_task(status="error", message="All errors:\n"+"".join(errors))

        if not os.path.exists(result_path):
            send_status_to_task(status="error", message="No /static/result")
        if not has_errors(result_path):
            with open(
                global_app.config["GTFS_ZIP_PATH"], "wb"
            ) as gtfs_file:
                ##  wrtie data from temporary file to file on server permanently
                gtfs_file.write(named_temp_zip.read())
            with global_app.app_context(): 
                add_gtfs_tables_to_db(db.engine, df_dict)
            global_app.config["time_since_last_gtfs"] =  datetime.datetime.now().timestamp()  #TODO: FIX
            send_status_to_task(status="done", message=" Finished adding tabled to db")
        else:
            validation_report = True
            raise Exception("Error validating the gtfs zip, check the validation report!")
    except Exception as e:
        print(e)
        print("validation_report", validation_report)
        send_status_to_task(status="error", message=str(e), validation_report=validation_report)
    finally:
        named_temp_zip.close()
        publish_kill(channel)


@gtfs_blueprint.get("/gtfs.xlsx")
@login_required
@has_roles("gtfs")
def get_gtfs_excel():
    return send_file(current_app.config["GTFS_EXCEL_PATH"])

@gtfs_blueprint.get("/gtfs.zip")
@login_required
@has_roles("gtfs")
def get_gtfs_zip_prasa():
    return send_file(current_app.config["GTFS_ZIP_PATH"])

@gtfs_blueprint.get("/report")
@login_required
@has_roles("gtfs")
def get_gtfs_validation_report():
    return send_file(os.path.join(current_app.config["GTFS_VALIDATOR_RESULT_PATH"], "report.html"))



@gtfs_blueprint.get("/google_gtfs")
def get_gtfs_zip_google():
    # username = request.args.get("username", None)
    # password = request.args.get("password", None)
    # try :
    #     if not check_feed_password(username=username, password=password):
    #         return f"Wrong username for {username}",403
    # except ValueError as e:
    #     return str(e), 400
    return send_file(current_app.config["GTFS_ZIP_PATH"])
    

@gtfs_blueprint.post("/upload_gtfs")
@login_required
@has_roles("gtfs")
def upload_gtfs():
    excel_file = request.files.get("file", None)

    if excel_file:

        task_id = str(uuid4())
        excel_file_perm_path = os.path.join(
            current_app.config["GTFS_EXCEL_PATH"]
        )
        with open(excel_file_perm_path, "wb") as excel_file_perm:
            excel_file_perm.write(excel_file.read())

        generate_gtfs_from_xlsx.delay( task_id, excel_file_perm_path)

        return task_id 
    return "No file given", 400
    ## give error if errors in report.json

@socketio.on('connect')
@login_required
@has_any_role("gtfs", "excel")
def test_connect():
    pass 

@socketio.on("join-room")
@login_required
@has_any_role("gtfs", "excel")
def join_room_ev(event):
    room = event["room"]
    # job_id = f"pubsub:{room}"
    join_room(room)
    # only once a user has joined a room should events be consumed in a separate thread
    listen_to_room.delay(room,room)


@gtfs_blueprint.get("/time_since_last_schedule")
def time_since_last_upload():
    try :
        timestamp_gtfs = os.path.getmtime(Path(current_app.config["SHARED_PRIVATE_FOLDER"], "gtfs.zip"))
        return str(timestamp_gtfs)
    except OSError as e:
        return 0
