from flask import (
    Blueprint,
    request,
    make_response,
    redirect,
    url_for,
    render_template,
    current_app,
)
from flask_wtf.csrf import generate_csrf
from wtforms import BooleanField, StringField, PasswordField, validators, SubmitField
from gtfs_rt_server.db_utils import (
    insert_user,
    password_hasher,
    delete_user_with_username,
    modify_user,
    list_users,
)
from gtfs_rt_server import get_user_by_username, has_roles
import argon2
from flask_login import login_required, login_user, logout_user, current_user
from werkzeug.exceptions import BadRequest, NotFound

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/list_users")
@login_required
@has_roles("admin")
def list_user_endp():
    return [
        {
            "username": user.username,
            "user_id": user.user_id,
            "roles": [role.name for role in user.roles],
        }
        for user in list_users()
    ]


# add
@auth_bp.post("/add_user")
@login_required
@has_roles("admin")
def add_user():
    adduser_form = request.form
    username = adduser_form.get("username", None)
    if not username:
        raise BadRequest("No username given")
    password = adduser_form.get("password", None)
    if not password:
        raise BadRequest("No password given")
    if len(password) < 10:
        raise BadRequest("Password must be more than 10 characters long")
    user = get_user_by_username(username)
    if user:
        raise BadRequest("User already exists")
    roles = adduser_form.getlist("roles[]")
    insert_user(username, password, roles)
    current_app.logger.debug(f"{current_user.username} added {username}.")
    return "Successful"


@auth_bp.put("/modify_user")
@login_required
@has_roles("admin")
def mod_user():
    moduser_form = request.form
    user_id = moduser_form.get("user_id", None)
    if not user_id:
        raise BadRequest("Must prove a user id for the user")
    username = moduser_form.get("username", None)
    if not username:
        raise BadRequest("Please enter a username")
    password = moduser_form.get("password", None)
    if not password:
        raise BadRequest("Please enter a password")
    if len(password) < 10:
        raise BadRequest("Password must be greater than 10 characters long")
    roles =  moduser_form.getlist("roles[]")
    if username == "admin" and "admin" not in roles :
        raise BadRequest("The admin user should always have the role to manage users.")
    modify_user(user_id, username, password, roles)
    return "Successful"


@auth_bp.delete("/delete_user/<username>")
@login_required
@has_roles("admin")
def delete_user(username):
    if not username:
        raise BadRequest("No username given")
    if username == "admin":
        raise BadRequest("Cannot delete the admin.")
    try:
        delete_user_with_username(username)
        return "Successful"
    except Exception as e:

        raise BadRequest(str(e))


@auth_bp.get("/user/<username>")
@login_required
@has_roles("admin")
def get_userinfo(username):
    user = get_user_by_username(username)
    if not user:
        raise NotFound(f"User with username {username} not found.")
    return {"username": user.username, "roles": [role.name for role in user.roles]}


@auth_bp.get("/csrf")
def csrf():
    return generate_csrf()


@auth_bp.post("/login")
def login_endpoint():
    login_form = request.form
    username = login_form.get("username", None)
    if not username:
        raise BadRequest("No username given")
    password = login_form.get("password", None)
    if not password:
        raise BadRequest("No password given")
    remember_me = login_form.get("remember_me", True)
    user = get_user_by_username(username)
    if not user:
        raise BadRequest("User doesn't exists")
    try:
        matches = password_hasher.verify(user.hash_pass, password)
        login_user(user, remember=remember_me)
        current_app.logger.debug(f"{current_user.username} logged in.")
        return [role.name for role in user.roles]
    except argon2.exceptions.VerifyMismatchError:
        raise BadRequest("Wrong password")


## store async protobuf as blob when edited and keep cache in memory


@auth_bp.get("/logout")
@login_required
def logout():
    logout_user()
    return "Successful"


#
