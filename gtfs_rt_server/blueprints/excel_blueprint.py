from flask import Blueprint,request , jsonify
from flask_login import  login_required
import datetime
from gtfs_rt_server import  has_roles , scheduler
from gtfs_rt_server.db_utils import create_service_excel 
from uuid import uuid4
from apscheduler.events import EVENT_JOB_EXECUTED
excel_bp = Blueprint("excel", __name__, url_prefix="/excel")

@excel_bp.post("/make_excel")
@login_required
@has_roles("excel")
def make_excel():

    current_time = datetime.datetime.now()

    filename = Path(
        current_app.config["EXCEL_SUMMARIES"], f"{current_time.strftime()}.xlsx"
    )

    task_id =  str(uuid4())
    scheduler.add_listener(, )
    scheduler.add_job(task_id,create_service_excel, kwargs={"filename":filename}, trigger="date", run_date = datetime.datetime.now()+datetime.timedelta(seconds=1))

    return task_id
