from flask import Blueprint, request, make_response, redirect, url_for, render_template
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
from gtfs_rt_server import db, scheduler, redis_client, socketio
from flask_login import login_required
from gtfs_rt_server.make_gtfs import generate_gtfs_zip, add_gtfs_tables_to_db, has_errors
from flask import current_app
from tempfile import NamedTemporaryFile, SpooledTemporaryFile
import os
from apscheduler.events import EVENT_JOB_REMOVED


gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")

def generate_gtfs_from_xlsx(channel,excel_file_path):
    print("stating generate gtfs xlsx task")
    # use this method as a helper to update the tasks metainfo to contain status and messages
    def send_status_to_task(status=None, message=None, **kwargs):
        socketio.emit("event", {"status":status, "message":message, **kwargs}, namespace=f"/{channel}")
        print(f"{status} {message}")
    ## create temp file to store zip
    named_temp_zip = NamedTemporaryFile(mode="w+b")
    validation_report = False
    try:

        send_status_to_task(status="starting", message="Starting ...")
        result_path = current_app.config["GTFS_VALIDATOR_RESULT_PATH"]
        df_dict = generate_gtfs_zip(
            excel_file_path,
            named_temp_zip.name,
            current_app.config["GTFS_VALIDATOR_PATH"],
            result_path,
            send_status_to_task,
        )
        ## read notices in report.json to find errors or warnings

        if not os.path.exists(result_path):
            send_status_to_task(status="error", message="No /static/result")
        if not has_errors(result_path):
            with open(
                os.path.join(current_app.config["SHARED_FOLDER"],"gtfs.zip"), "wb"
            ) as gtfs_file:
                ##  wrtie data from temporary file to file on server permanently
                gtfs_file.write(named_temp_zip.read())
            add_gtfs_tables_to_db(db.engine, df_dict)
            current_app.config["time_since_last_gtfs"] =  datetime.datetime.now().timestamp() 
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
def upload_gtfs():
    excel_file = request.files.get("file", None)
    if excel_file:

        ## stop current thread running if any
        ## start
        scheduler.remove_job("gtfs_upload")
        def job_remove_event(event):
            redis_client.publish("gtfs_upload", {"status":"error", "message": "The job was terminated abruptly."})
        scheduler.add_listener(job_remove_event, mask=EVENT_JOB_REMOVED)

        excel_file_perm_path = os.path.join(
            current_app.config["SHARED_FOLDER"], "gtfs.xlsx"
        )
        with open(excel_file_perm_path, "wb") as excel_file_perm:
            excel_file_perm.write(excel_file.read())
        
        scheduler.add_job("gtfs_upload", generate_gtfs_from_xlsx,channel="gtfs_upload",  excel_file_path=excel_file_perm_path)

        return "gtfs_upload"
    return "No file given", 400
    ## give error if errors in report.json

@gtfs_blueprint.get("/time_since_last_schedule")
def time_since_last_upload():
    return current_app.config["time_since_last_gtfs"]