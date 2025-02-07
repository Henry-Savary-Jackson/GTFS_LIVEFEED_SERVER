
from flask import Blueprint,request , make_response, redirect, url_for, render_template
from flask_login import login_required, login_user, current_user, logout_user
from wtforms import BooleanField, StringField,PasswordField, validators, SubmitField
from flask_wtf import FlaskForm
from gtfs_rt_server.db_utils import insert_user, password_hasher
from gtfs_rt_server.schema import get_user_by_username
import argon2

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

class LoginForm(FlaskForm):
    username= StringField(label="Username", validators=[validators.DataRequired()])
    password = PasswordField(label="Password", validators=[validators.DataRequired() ])
    remember_me = BooleanField(label="Remember me", default=True, validators=[validators.DataRequired()])
    submit = SubmitField('Login')

@auth_bp.route("/login", methods=["GET","POST"])
def login_endpoint():
    login_form = LoginForm()
    if request.method == "POST" and login_form.validate_on_submit():
        user = get_user_by_username(login_form.data["username"])
        if not user:
            return render_template("login.html", form=login_form,error="No such user") , 400
        try:
            matches = password_hasher.verify(user.hash_pass, login_form.data["password"])
            login_user(user, remember=login_form.data["remember_me"])
            print(current_user.username, "logged in ")
            return redirect("/")
        except argon2.exceptions.VerifyMismatchError:
            return render_template("login.html",form=login_form, error="Wrong password"), 400 
    return render_template("login.html", form=login_form), 200 if  request.method != "POST" else 400        
## store async protobuf as blob when edited and keep cache in memory

@auth_bp.get("/logout")
@login_required
def logout():
    logout_user()
    return redirect("/auth/login")
#
