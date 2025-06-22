from flask import Blueprint, request, jsonify, make_response ,send_from_directory
from werkzeug.exceptions import NotFound
from flask_login import login_required
import datetime
from gtfs_rt_server import has_roles, scheduler, socketio
from gtfs_rt_server.db_utils import create_service_excel
from uuid import uuid4
from apscheduler.events import EVENT_JOB_EXECUTED
import os
from pathlib import Path

excel_bp = Blueprint("excel", __name__, url_prefix="/excel")


def create_excel_task(task_id, folder, filename):
    try:
        create_service_excel(Path(folder, filename))
        socketio.emit(
            "finished", {"status": "success", "message": filename}, room=task_id
        )
    except Exception as e:
        socketio.emit(
            "finished",
            {"status": "error", "message": str(e)},
            room=task_id,
        )


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

    filename = f"{current_time.strftime()}.xlsx"

    task_id = str(uuid4())
    scheduler.add_job(
        task_id,
        create_excel_task,
        kwargs={
            "folder": current_app.config["EXCEL_SUMMARIES"],
            "task_id": task_id,
            "filename": filename,
        },
        trigger="date",
        run_date=datetime.datetime.now() + datetime.timedelta(seconds=1),
    )

    return task_id
