from flask import Blueprint, request, make_response, redirect, url_for, render_template
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
from gtfs_rt_server import db, scheduler , socketio, has_roles, has_any_role
from gtfs_rt_server.make_gtfs import generate_gtfs_zip, add_gtfs_tables_to_db, has_errors
from flask import current_app
from flask_socketio import join_room
from tempfile import NamedTemporaryFile, SpooledTemporaryFile
import os
from apscheduler.events import EVENT_JOB_REMOVED
from uuid import uuid4

gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")

def generate_gtfs_from_xlsx(channel,excel_file_path):
    print("stating generate gtfs xlsx task")
    # use this method as a helper to update the tasks metainfo to contain status and messages
    # socketio.emit("event", {"status":"working", "message":"starting..." },)
    def send_status_to_task(status="working", message=None, **kwargs):
        socketio.emit("event", {"status":status, "message":message, **kwargs},room=channel)
        # print(f"{status} {message}")
    ## create temp file to store zip
    named_temp_zip = NamedTemporaryFile(mode="w+b")
    validation_report = False
    try:

        send_status_to_task(status="starting", message="Starting ...")
        result_path = scheduler.app.config["GTFS_VALIDATOR_RESULT_PATH"]
        df_dict = generate_gtfs_zip(
            excel_file_path,
            named_temp_zip.name,
            scheduler.app.config["GTFS_VALIDATOR_PATH"],
            result_path,
            send_status_to_task,
        )
        ## read notices in report.json to find errors or warnings

        if not os.path.exists(result_path):
            send_status_to_task(status="error", message="No /static/result")
        if not has_errors(result_path):
            with open(
                os.path.join(scheduler.app.config["SHARED_FOLDER"],"gtfs.zip"), "wb"
            ) as gtfs_file:
                ##  wrtie data from temporary file to file on server permanently
                gtfs_file.write(named_temp_zip.read())
            add_gtfs_tables_to_db(db.engine, df_dict)
            scheduler.app.config["time_since_last_gtfs"] =  datetime.datetime.now().timestamp() 
            send_status_to_task(status="done", message=" Finished adding tabled to db")
        else:
            validation_report = True
            raise Exception("Error validating the gtfs zip, check the validation report!")
    except Exception as e:
        print(e)
        print("validation_report", validation_report)
        send_status_to_task(status="error", message=str(e), validation_report=validation_report)
        raise e
    finally:
        named_temp_zip.close()


@gtfs_blueprint.post("/upload_gtfs")
@login_required
@has_roles("gtfs")
def upload_gtfs():
    excel_file = request.files.get("file", None)
    if excel_file:

        ## stop current thread running if any
        ## see if you can deal with multiple uploads at the same time (maybe not necessary or adviable)
        def job_remove_event(event):
            socketio.emit("event", {"status":"error", "message": "The job was terminated abruptly."}, room="gtfs_upload")

        if scheduler.get_job("gtfs_upload"):
            scheduler.remove_job("gtfs_upload")
            scheduler.remove_listener(job_remove_event)

        scheduler.add_listener(job_remove_event, mask=EVENT_JOB_REMOVED)

        excel_file_perm_path = os.path.join(
            current_app.config["SHARED_FOLDER"], "gtfs.xlsx"
        )
        with open(excel_file_perm_path, "wb") as excel_file_perm:
            excel_file_perm.write(excel_file.read())
        
        # socketio.emit("event", {"status":"working", "message":"starting..." })
        run_date = datetime.datetime.now() + datetime.timedelta(seconds=1)
        scheduler.add_job("gtfs_upload",  generate_gtfs_from_xlsx, kwargs={"channel":"gtfs_upload",  "excel_file_path":excel_file_perm_path}, trigger="date", run_date=run_date)

        return "gtfs_upload"
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
    join_room(event["room"])


@gtfs_blueprint.get("/time_since_last_schedule")
def time_since_last_upload():
    current_app.logger.debug(str(current_app.config["time_since_last_gtfs"]))
    # socketio.emit("event", {"status":"working", "message":current_app.config["time_since_last_gtfs"]} )
    return str(current_app.config["time_since_last_gtfs"])