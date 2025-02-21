
from flask import Blueprint,request , make_response, redirect, url_for, render_template
from flask_login import login_required, login_user, current_user, logout_user
from wtforms import BooleanField, StringField,PasswordField, validators, SubmitField
from flask_wtf import FlaskForm
from gtfs_rt_server.db_utils import insert_user, password_hasher
from gtfs_rt_server.schema import get_user_by_username
import argon2
from flask_wtf.csrf import generate_csrf

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.get("/csrf")
def csrf():
    return generate_csrf() 

@auth_bp.post("/login")
def login_endpoint():
    login_form = request.form
    username = login_form.get("username", None)
    if not username:
        return "No username given", 400
    password = login_form.get("password", None)
    if not password:
        return "No password given", 400
    remember_me = login_form.get("remember_me", True)
    user = get_user_by_username(username)
    if not user:
        return "No such user" , 400
    try:
        matches = password_hasher.verify(user.hash_pass, password)
        login_user(user, remember=remember_me)
        print(current_user.username, "logged in ")
        return "Successful"
    except argon2.exceptions.VerifyMismatchError:
        return "Wrong password", 400 
## store async protobuf as blob when edited and keep cache in memory

@auth_bp.get("/logout")
@login_required
def logout():
    logout_user()
    return "Success"
#
