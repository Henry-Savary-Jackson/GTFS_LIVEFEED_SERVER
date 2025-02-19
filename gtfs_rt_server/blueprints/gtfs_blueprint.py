
from flask import Blueprint,request , make_response, redirect, url_for, render_template
from wtforms import BooleanField, StringField,RadioField,SearchField,PasswordField, validators, SubmitField, FileField
from flask_login import login_required
from flask_wtf import FlaskForm
from gtfs_rt_server.make_gtfs import generate_gtfs_zip, add_gtfs_tables_to_db
import celery
from celery.result import AsyncResult
from celery.task.control import revoke
from tempfile import NamedTemporaryFile
import os
gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")

@celery.shared_task()
def generate_gtfs_from_xlsx(file):
    ## create temp file to store zip
    named_temp_zip = NamedTemporaryFile()
    try:
        df_dict = generate_gtfs_zip(file,named_temp_zip)
        ## read notices in report.json
        if not os.path.exists("static/result"):
            return "No /static/result"
        if not has_errors("static/result"):
            with open(os.path.normpath(f"{os.path.dirname(__file__)}/static/gtfs.zip", "wb")) as gtfs_file:
                ##  wrtie data
                with open(named_temp_zip.name) as temp_zip_fd:
                    gtfs_file.write(temp_zip_fd.read())
            add_gtfs_tables_to_db(db.engine,df_dict)
            return "Success"
    finally:
        os.remove(named_temp_zip.name)


@gtfs_blueprint.get("/status")
@login_required
def get_status():
    if "upload_gtfs_task_id" in current_app.config and current_app.config["upload_gtfs_task_id"]:
        result = AsyncResult(current_app.config["upload_gtfs_task_id"])
        return {"status":result.status , "result":result.result}
    
    return "No task running",400

@gtfs_blueprint.post("/upload_gtfs")
@login_required
def upload_gtfs():

    file_form = request.form.get("file", None)
    if not file_form:
        return "No file given" , 400

        file = file_form.data["file"]
        if "upload_gtfs_task_id" in current_app.config and current_app.config["upload_gtfs_task_id"]:
            # cancel result
            result = AsyncResult(current_app.config["upload_gtfs_task_id"])
            result.revoke()
        result = generate_gtfs_from_xlsx.delay(file)
        current_app.config["upload_gtfs_task_id"] = result.id
    return result.id
    ## give error if errors in report.json

