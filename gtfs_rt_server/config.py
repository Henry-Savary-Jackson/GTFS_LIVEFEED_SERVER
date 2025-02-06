
from flask_login import LoginManager
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path


def create_app():
    app = Flask("gtfs_rt_server")
    return app

def create_login_manager(app):
    login_manager = LoginManager(app)
    login_manager.session_protection = "strong"
    login_manager.login_view = "login"
    return login_manager

def create_sqlalchemy_db(app):
    return SQLAlchemy(app)

def register_blueprints(app):
    from gtfs_rt_server.blueprints import auth_blueprint, db_blueprint, feed_blueprint, gtfs_blueprint, page_blueprint
    app.register_blueprint(auth_blueprint.auth_bp)
    app.register_blueprint(db_blueprint.db_bp)
    app.register_blueprint(feed_blueprint.feed_bp)
    app.register_blueprint(gtfs_blueprint.gtfs_blueprint)
    app.register_blueprint(page_blueprint.page_bp)

def init_db(app,db):
    with app.app_context():
        db.create_all()

def init_app():
    app = create_app()
    config = os.getenv("FLASK_ENVIRON")
    app.config.from_object( config if config else "config.DevConfig")
    db = create_sqlalchemy_db(app)
    login_manager = create_login_manager(app)
    init_db(app, db)

    return app,  db, login_manager

