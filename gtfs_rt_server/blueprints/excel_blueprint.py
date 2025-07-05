from flask import Blueprint, request, jsonify, make_response ,send_from_directory, current_app
from werkzeug.exceptions import NotFound
from flask_login import login_required
import datetime
from gtfs_rt_server import has_roles,socketio, db,redis , global_app
from gtfs_rt_server.db_utils import create_service_excel
from gtfs_rt_server.redis_utils import publish_event, publish_kill
from uuid import uuid4
import os
from werkzeug.security import safe_join
import json
from pathlib import Path
from celery import shared_task

excel_bp = Blueprint("excel", __name__, url_prefix="/excel")

@shared_task
def create_excel_task(task_id, folder, filename):
    try:
        with global_app.app_context(): 
            with db.session.begin():
                create_service_excel(Path(folder, filename))
                publish_event(task_id, "finished", {"status":"success", "message":filename})
    except Exception as e:
        publish_event(task_id, "finished", {"status": "error", "message": str(e)})
    finally:
        publish_kill(task_id)


@excel_bp.delete("/<path:filename>")
@login_required
@has_roles("excel")
def del_excel(filename):
    path = safe_join(current_app.config["EXCEL_SUMMARIES"], filename)
    if not path:
        raise NotFound()
    os.remove(path)
    return "Successful"
        
@excel_bp.get("/<path:filename>")
@login_required
@has_roles("excel")
def get_excel(filename):
    return send_from_directory(current_app.config["EXCEL_SUMMARIES"],filename) 

@excel_bp.get("/list_excel")
@login_required
@has_roles("excel")
def list_excels():
    return list(filter( lambda file: file.endswith(".xlsx"), os.listdir(current_app.config["EXCEL_SUMMARIES"])))

@excel_bp.post("/make_excel")
@login_required
@has_roles("excel")
def make_excel():

    current_time = datetime.datetime.now()

    filename = f"{current_time.isoformat()}.xlsx"
    task_id = str(uuid4())

    create_excel_task.delay(task_id,current_app.config["EXCEL_SUMMARIES"], filename)

    return task_id
