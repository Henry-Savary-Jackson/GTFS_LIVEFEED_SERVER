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
from gtfs_rt_server import db
from flask_login import login_required
from flask_wtf import FlaskForm
from gtfs_rt_server.make_gtfs import generate_gtfs_zip, add_gtfs_tables_to_db, has_errors
import celery
from celery.states import *
from celery import current_task
from flask import current_app
from celery.result import AsyncResult
from tempfile import NamedTemporaryFile, SpooledTemporaryFile
import os

gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")


@celery.shared_task()
def generate_gtfs_from_xlsx(excel_file_path):
    print("stating generate gtfs xlsx task")
    # use this method as a helper to update the tasks metainfo to contain status and messages
    def send_status_to_task(status=None, message=None):
        print(status, message)
        current_task.update_task_status(current_task.request.id, status=status, message=message)

    ## create temp file to store zip
    named_temp_zip = NamedTemporaryFile(mode="w+b")

    try:
        send_status_to_task(status="starting", message="Starting ...")
        df_dict = generate_gtfs_zip(
            excel_file_path,
            named_temp_zip.name,
            current_app.config["GTFS_VALIDATOR_PATH"],
            current_app.config["GTFS_VALIDATOR_RESULT_PATH"],
            send_status_to_task,
        )
        ## read notices in report.json

        result_path = os.path.join(f"{current_app.config["SHARED_FOLDER"]}", "result")
        if not os.path.exists(result_path):
            send_status_to_task(status="error", message="No /static/result")
        if not has_errors(result_path):
            with open(
                os.path.join(current_app.config["SHARED_FOLDER"],"gtfs.zip"), "wb"
            ) as gtfs_file:
                ##  wrtie data from temporary file to file on server permanently
                gtfs_file.write(named_temp_zip.read())
            add_gtfs_tables_to_db(db.engine, df_dict)
            send_status_to_task(status="done", message=" Finished adding tabled to db")
    except Exception as e:
        print(e)
        send_status_to_task(status="error", message=str(e))
        raise e
    finally:
        named_temp_zip.close()


@gtfs_blueprint.get("/status")
@login_required
def get_status():
    if (
        "upload_gtfs_task_id" in current_app.config
        and current_app.config["upload_gtfs_task_id"]
    ):
        result = AsyncResult(current_app.config["upload_gtfs_task_id"])
        if (result.ready() and not result.failed()):
            return {"status":"done", "message":"done"}
        return result.info or dict(status="starting", message="starting...") 
    return {"status":"not started", "message":"No such task exists"} 


@gtfs_blueprint.post("/upload_gtfs")
@login_required
def upload_gtfs():
    excel_file = request.files.get("file", None)
    if excel_file:

        ## stop current thread running if any
        ## start
        if (
            "upload_gtfs_task_id" in current_app.config
            and current_app.config["upload_gtfs_task_id"]
        ):
            # cancel result
            result = AsyncResult(current_app.config["upload_gtfs_task_id"])
            result.revoke()
        excel_file_perm_path = os.path.join(
            current_app.config["SHARED_FOLDER"], "gtfs.xlsx"
        )
        with open(excel_file_perm_path, "wb") as excel_file_perm:
            excel_file_perm.write(excel_file.read())
        
        result = generate_gtfs_from_xlsx.delay(excel_file_perm_path)
        current_app.config["upload_gtfs_task_id"] = result.id
        return result.id

    return "No file given", 400
    ## give error if errors in report.json
