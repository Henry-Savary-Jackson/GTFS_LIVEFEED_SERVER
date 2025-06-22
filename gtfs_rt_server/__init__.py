from flask_login import LoginManager
from apscheduler.triggers.base import BaseTrigger
from flask_socketio import SocketIO
import datetime
from flask_wtf import CSRFProtect
from werkzeug.exceptions import HTTPException, BadRequest, InternalServerError, Unauthorized,Forbidden 
from flask import Flask, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import json
from flask_apscheduler import APScheduler 
from apscheduler.jobstores.redis import  RedisJobStore 
import os
from pathlib import Path
from typing import Optional
from flask.logging import default_handler
from flask import has_request_context, request
from logging import getLogger, FileHandler, DEBUG
import logging
from threading import Lock
from flask_login import current_user
from flask import wrappers
from gtfs_rt_server.protobuf_utils import get_feed_object_from_file,save_feed_to_file,  delete_expired_trip_updates
from functools import wraps
from flask import current_app
from gtfs_rt_server.schema import db, get_user_by_username, User, Role

lock = Lock()
scheduler = APScheduler()
socketio = SocketIO()

def has_roles(*roles):
    
    def decorator(f):
        @wraps(f)
        def dec_func(*args, **kwargs):
            with db.session.begin():
                if not current_user:
                    raise Unauthorized("User is not logged in")
                
                given_roles = set(roles)
                for role in current_user.roles:
                    if role.name in given_roles:
                        given_roles.remove(role.name)

                if len(given_roles) > 0:
                    raise Forbidden( f"User does not have roles {"".join(given_roles)}") 
            return f(*args, **kwargs)
        return dec_func
    return decorator




def create_logger(app):
    logger = getLogger("gunicorn.error") # how to handle different levels and different configurations
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

    login_manager = LoginManager(app)

    login_manager.session_protection = "strong"
    login_manager.login_view = "login"
    @login_manager.unauthorized_handler
    def unauthorized():
    # do stuff
        raise BadRequest("User is not logged in or is unauthorized. Please login again with the correct credentials")  


    login_manager.user_loader(get_user_by_username)

    return login_manager

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

def init_sockiet_io(app):
    socketio.init_app(app, path="/ws", cors_allowed_origins="*")

def init_app():
    global db

    app = create_app()
    config = os.getenv("FLASK_ENVIRON")
    app.config.from_object( config if config else "config.Config")
    app.static_folder = app.config["STATIC_FOLDER"]

    # get different feeds from files for alerts and stoptimes and vehicle positions

    app.config["feed_alerts_location"] = Path(app.config["FEEDS_LOCATION"]) / "alerts.bin" 
    app.config["feed_updates_location"] = Path(app.config["FEEDS_LOCATION"]) / "updates.bin"
    app.config["feed_positions_location"] = Path(app.config["FEEDS_LOCATION"]) / "positions.bin"

    app.config["feed_alerts"] = get_feed_object_from_file(app.config["feed_alerts_location"])
    app.config["feed_updates"] = get_feed_object_from_file(app.config["feed_updates_location"])
    app.config["feed_positions"] = get_feed_object_from_file(app.config["feed_positions_location"])
    login_manager = create_login_manager(app)
    init_db(app, db)
    init_CORS(app)

    if app.config["WTF_CSRF_ENABLED"]:
        csrf= init_csrf(app)
    create_logger(app)
    init_scheduler(app)
    create_error_handlers(app)
    init_sockiet_io(app)
    register_blueprints(app)
    app.config["time_since_last_gtfs"] = datetime.datetime.now().timestamp() 
    scheduler.start() # start scheduler 
    return app

