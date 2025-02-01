from flask_sqlalchemy import SQLAlchemy
from flask import Flask,request , make_response, redirect, url_for
from argon2 import PasswordHasher
from flask_login.login_manager import LoginManager
from dotenv import load_dotenv
import os

load_dotenv()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASS")

# SQLITE_DB_PATH = os.path.normpath(f"{os.path.dirname(__file__)}/gtfs.sqlite3")
SQLITE_DB_PATH = "gtfs.sqlite3"

SQLITE_URI= f"sqlite:///{SQLITE_DB_PATH}"

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv("FLASK_SECURE_KEY") 
app.config["SQLALCHEMY_DATABASE_URI"] = SQLITE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.session_protection = "strong"
login_manager.login_view = "login"
password_hasher = PasswordHasher() 
