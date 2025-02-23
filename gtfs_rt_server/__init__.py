from flask_login import LoginManager
from flask import Flask, redirect
from flask_wtf import CSRFProtect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path
from typing import Optional
from celery import Task, Celery
from celery.exceptions import Ignore

db = SQLAlchemy()

def create_app():
    app = Flask("gtfs_rt_server")
    return app

def create_login_manager(app):
    from gtfs_rt_server.schema import User, get_user_by_username

    login_manager = LoginManager(app)

    login_manager.session_protection = "strong"
    login_manager.login_view = "login"
    @login_manager.unauthorized_handler
    def unauthorized():
    # do stuff
        return redirect("/auth/login") 


    login_manager.user_loader(get_user_by_username)

    return login_manager

## from https://flask.palletsprojects.com/en/stable/patterns/celery/
def init_celery_app(app):
    class FlaskTask(Task):

        status_dict = {"status":"starting", "message":"starting..."}

        def on_success(self, retval, task_id, args, kwargs):
        # Update result with custom structure
            super().on_success(retval, task_id, args, kwargs)
            self.update_task_status(task_id, "success", f"{retval}\nDone")

        def on_failure(self, exc, task_id, args, kwargs, einfo):
            # Handle failure and update status and message
            super().on_failure(exc, task_id, args, kwargs, einfo)
            self.update_task_status(task_id, "error", str(exc))

        def update_task_status(self, task_id, status, message):
            result = self.AsyncResult(task_id)
            self.status_dict.update({"status": status, "message": f"{ result.info["message"] if result.info and "message" in result.info else ''}\n{message}"})
            result.backend.store_result(task_id, self.status_dict , status)
        
        def __call__(self, *args: object, **kwargs: object) -> object:
            try :
                with app.app_context():
                    return self.run(*args, **kwargs)
            except Exception as e:
                # Handle any errors
                raise Ignore(f"Task failed due to exception:{e}")

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(app.config["CELERY"])
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
        db.drop_all()
        db.create_all()

def init_csrf(app):
    return CSRFProtect(app)

def init_CORS(app):
    return CORS(app,supports_credentials=True,origins=["http://localhost:5000", "http://localhost:3000"])

def init_app():
    global db

    app = create_app()
    config = os.getenv("FLASK_ENVIRON")
    app.config.from_object( config if config else "config.DevConfig")
    from gtfs_rt_server.protobuf_utils import get_feed_object_from_file
    app.static_folder = app.config["STATIC_FOLDER"]
    app.config["feed"] = get_feed_object_from_file(app.config["FEED_LOCATION"])

    login_manager = create_login_manager(app)
    register_blueprints(app)

    init_db(app, db)
    init_CORS(app)
    if app.config["WTF_CSRF_ENABLED"]:
        csrf= init_csrf(app)
    celery_app = init_celery_app(app)
    return app

