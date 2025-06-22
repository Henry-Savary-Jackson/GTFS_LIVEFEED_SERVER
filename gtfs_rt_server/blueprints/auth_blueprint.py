
from flask import Blueprint,request , make_response, redirect, url_for, render_template, current_app
from flask_wtf.csrf import generate_csrf
from wtforms import BooleanField, StringField,PasswordField, validators, SubmitField
from gtfs_rt_server.db_utils import insert_user, password_hasher,delete_user_with_username 
from gtfs_rt_server import get_user_by_username, has_roles 
import argon2
from flask_login import  login_required, login_user, logout_user, current_user
from werkzeug.exceptions import BadRequest

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.get("/list_users")

# add
@auth_bp.post("/add_user")
@login_required
@has_roles("admin")
def add_user():
    adduser_form = request.form
    username = login_form.get("username", None)
    if not username:
        raise BadRequest( "No username given") 
    password = login_form.get("password", None)
    if not password:
        raise BadRequest( "No password given") 
    
    user = get_user_by_username(username)
    if user:
        raise BadRequest( "User already exists") 
    roles = adduser_form.getlist("roles")
    insert_user(username, password, roles)
    current_app.logger.debug(f"{current_user.username} added {username}.")
    return "Successful"

@auth_bp.delete("/delete_user")
@login_required
@has_roles("admin")
def delete_user():
    adduser_form = request.form
    if not username:
        raise BadRequest( "No username given") 
    try :
        delete_user_with_username(username)
        return "Successful"
    except Exception as e:
        raise BadRequest( str(e)) 

@auth_bp.get("/csrf")
def csrf():
    return generate_csrf() 

@auth_bp.post("/login")
def login_endpoint():
    login_form = request.form
    username = login_form.get("username", None)
    if not username:
        raise BadRequest( "No username given") 
    password = login_form.get("password", None)
    if not password:
        raise BadRequest( "No password given") 
    remember_me = login_form.get("remember_me", True)
    user = get_user_by_username(username)
    if not user:
        raise BadRequest( "User doesn't exists") 
    try:
        matches = password_hasher.verify(user.hash_pass, password)
        login_user(user, remember=remember_me)
        current_app.logger.debug(f"{current_user.username} logged in.")
        return [ role.name for role in user.roles ]
    except argon2.exceptions.VerifyMismatchError:
        raise BadRequest( "Wrong password") 
## store async protobuf as blob when edited and keep cache in memory

@auth_bp.get("/logout")
@login_required
def logout():
    logout_user()
    return "Successful"
#
