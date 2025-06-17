from flask_login import LoginManager
from flask_socketio import SocketIO
import datetime
from flask_wtf import CSRFProtect
from werkzeug.exceptions import HTTPException, BadRequest, InternalServerError
from flask import Flask, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import json
from flask_apscheduler import APScheduler 
from apscheduler.jobstores.redis import  RedisJobStore 
import os
from pathlib import Path
from typing import Optional
from celery import Task, Celery
from celery.exceptions import Ignore
from flask.logging import default_handler
from flask import has_request_context, request
from logging import getLogger, FileHandler, DEBUG
import logging
from threading import Lock
from flask_redis import FlaskRedis 
lock = Lock()
db = SQLAlchemy()
scheduler = APScheduler()
redis_client = FlaskRedis()
socketio = SocketIO()

from gtfs_rt_server.protobuf_utils import save_feed_to_file,  delete_expired_trip_updates
# from https://flask.palletsprojects.com/en/stable/logging/#injecting-request-information 
class RequestFormatter(logging.Formatter):
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.remote_addr
        else:
            record.url = None
            record.remote_addr = None

        return super().format(record)

def create_logger(app):
    fm=  RequestFormatter(
    '[%(asctime)s] %(remote_addr)s requested %(url)s\n'
    '%(levelname)s in %(module)s: %(message)s'
    )
    logger = getLogger("gunicorn.debug") # how to handle different levels and different configurations
    default_handler.setFormatter(fm)
    default_handler.setLevel(DEBUG)
    fileHandler = FileHandler(app.config["LOGGING_FILE_PATH"], mode="a")
    fileHandler.setFormatter(fm)
    fileHandler.setLevel(DEBUG)
    logger.addHandler(default_handler)
    logger.addHandler(fileHandler)
    app.logger = logger
    return logger

def create_app():
    app = Flask("gtfs_rt_server")
    return app

def create_error_handlers(app):

    @app.errorhandler(HTTPException)
    def InternalErrorHandler(e):
        response = e.get_response()
        response.data = json.dumps({
            "code": e.code,
            "error": e.name,
            "description": e.description,
        })
        response.content_type = "application/json"
        return response


def create_login_manager(app):
    from gtfs_rt_server.schema import User, get_user_by_username

    login_manager = LoginManager(app)

    login_manager.session_protection = "strong"
    login_manager.login_view = "login"
    @login_manager.unauthorized_handler
    def unauthorized():
    # do stuff
        raise BadRequest("User is not logged in or is unauthorized. Please login again with the correct credentials")  


    login_manager.user_loader(get_user_by_username)

    return login_manager


## from https://flask.palletsprojects.com/en/stable/patterns/celery/
# def init_celery_app(app):

#     class FlaskTask(Task):

#         status_dict = {"status":"starting", "message":"starting..."}

#         def on_success(self, retval, task_id, args, kwargs):
#         # Update result with custom structure
#             super().on_success(retval, task_id, args, kwargs)
#             self.update_task_status(task_id, "success", f"{retval}\nDone")

#         def on_failure(self, exc, task_id, args, kwargs, einfo):
#             # Handle failure and update status and message
#             super().on_failure(exc, task_id, args, kwargs, einfo)
#             self.update_task_status(task_id, "error", str(exc))

#         def update_task_status(self, task_id, status, message, **kwargs):
#             result = self.AsyncResult(task_id)
#             self.status_dict.update({"status": status, "message": f"{ result.info["message"] if result.info and "message" in result.info else ''}\n{message}", **kwargs})
#             result.backend.store_result(task_id, self.status_dict , status)
        
#         def __call__(self, *args: object, **kwargs: object) -> object:
#             try :
#                 with app.app_context():
#                     return self.run(*args, **kwargs)
#             except Exception as e:
#                 # Handle any errors
#                 raise Ignore(f"Task failed due to exception:{e}")

#     celery_app = Celery(app.name, task_cls=FlaskTask)
#     celery_app.config_from_object(app.config["CELERY"])


    
    # celery_app.add_periodic_task(30*60*60, periodic_remove_expired  )

    celery_app.set_default()
    app.extensions["celery"] = celery_app
    return celery_app

def register_blueprints(app):
    from gtfs_rt_server.blueprints import auth_blueprint, db_blueprint, feed_blueprint, gtfs_blueprint, page_blueprint
    app.register_blueprint(auth_blueprint.auth_bp)
    app.register_blueprint(db_blueprint.db_bp)
    app.register_blueprint(feed_blueprint.feed_bp)
    app.register_blueprint(gtfs_blueprint.gtfs_blueprint)
    app.register_blueprint(page_blueprint.page_bp)

def init_db(app,db):
    db.init_app(app)
    with app.app_context():
        db.create_all()

def init_csrf(app):
    return CSRFProtect(app)

def init_CORS(app):
    return CORS(app,supports_credentials=True) 

def init_scheduler(app):
    scheduler.init_app(app)

def init_redis_client(app):
    redis_client.init_app(app)

def init_sockiet_io(app):
    socketio.init_app(app, path="/ws", message_queue=app.config["REDIS_URL"])

def init_app():
    global db

    app = create_app()
    config = os.getenv("FLASK_ENVIRON")
    app.config.from_object( config if config else "config.Config")
    from gtfs_rt_server.protobuf_utils import get_feed_object_from_file
    app.static_folder = app.config["STATIC_FOLDER"]
    # get different feeds from files for alerts and stoptimes and vehicle positions

    app.config["feed_alerts_location"] = Path(app.config["FEEDS_LOCATION"]) / "alerts.bin" 
    app.config["feed_updates_location"] = Path(app.config["FEEDS_LOCATION"]) / "updates.bin"
    app.config["feed_positions_location"] = Path(app.config["FEEDS_LOCATION"]) / "positions.bin"

    app.config["feed_alerts"] = get_feed_object_from_file(app.config["feed_alerts_location"])
    app.config["feed_updates"] = get_feed_object_from_file(app.config["feed_updates_location"])
    app.config["feed_positions"] = get_feed_object_from_file(app.config["feed_positions_location"])
    login_manager = create_login_manager(app)
    register_blueprints(app)


    init_db(app, db)
    init_CORS(app)
    if app.config["WTF_CSRF_ENABLED"]:
        csrf= init_csrf(app)
    create_logger(app)
    # init_redis_client(app)
    init_scheduler(app)
    create_error_handlers(app)
    init_sockiet_io(app)
    app.config["time_since_last_gtfs"] = datetime.datetime.now().timestamp() 
    scheduler.start() # start scheduler 
    return app
    # must run socket io with app

