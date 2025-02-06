from flask_login import LoginManager
from flask import Flask, redirect
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path
from typing import Optional

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


def init_app():
    global db
    app = create_app()
    config = os.getenv("FLASK_ENVIRON")
    app.config.from_object( config if config else "config.DevConfig")
    from gtfs_rt_server.protobuf_utils import get_feed_object_from_file
    app.config["feed"] = get_feed_object_from_file(app.config["FEED_LOCATION"])

    login_manager = create_login_manager(app)
    register_blueprints(app)
    init_db(app, db)
    return app

