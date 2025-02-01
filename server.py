import os
import datetime
from flask import Flask,request , make_response, redirect, url_for, render_template
import argon2
import sqlite3
from  uuid import uuid4
from make_gtfs import generate_gtfs_zip, has_errors, add_gtfs_tables_to_db
from google.transit import gtfs_realtime_pb2
from flask_login import login_required, login_user, current_user, logout_user
from config import * 
from db_utils import get_user_by_username, insert_user
from wtforms import BooleanField, StringField, PasswordField, validators, SubmitField, FileField
from flask_wtf import FlaskForm

class GTFSFileUploadForm(FlaskForm):
    file = FileField(label="Upload GTFS file", validators=[validators.DataRequired() ])
    submit = SubmitField()

class LoginForm(FlaskForm):
    username= StringField(label="Username", validators=[validators.DataRequired()])
    password = PasswordField(label="Password", validators=[validators.DataRequired(), validators.Length(min=8, max=24)])
    remember_me = BooleanField(label="Remember me", default=True, validators=[validators.DataRequired()])
    submit = SubmitField('Login')

@app.route("/")
@login_required
def main_page():
    return render_template("index.html")

@app.route("/upload_gtfs", methods=["GET", "POST"])
@login_required
def upload_gtfs():

    file_form = GTFSFileUploadForm()
    if request.method == "POST" and file_form.validate_on_submit():
        file = file_form.data["file"]
    ## add dataframes to sqlite databases   
        result_path = "static/result"
        try :
            df_dict = generate_gtfs_zip(file, "static")
            ## read notices in report.json
            if not os.path.exists("static/result"):
                return render_template("gtfs_upload.html", form=file_form, error="couldn't find validation report"), 400 
            if has_errors("static/result"):
                os.remove("static/gtfs.zip") 
            else:
                add_gtfs_tables_to_db(db.engine,df_dict)

            return redirect("/static/result/report.html")
            
        except Exception as e:
            return render_template("gtfs_upload.html", form=file_form, error=str(e)) , 400
    return render_template("gtfs_upload.html", form=file_form)
    ## give error if errors in report.json


@app.route("/login", methods=["GET","POST"])
def login_endpoint():
    login_form = LoginForm()
    if request.method == "POST" and login_form.validate_on_submit():
        user = get_user_by_username(login_form.data["username"])
        print(user, user.username)
        if not user:
            return render_template("login.html", form=login_form,error="No such user") , 400
        ## handle no user
        try:
            matches = password_hasher.verify(user.hash_pass, login_form.data["password"])
            login_user(user, remember=login_form.data["remember_me"])
            return redirect("/")
        except argon2.exceptions.VerifyMismatchError:
            return render_template("login.html",form=login_form, error="Wrong password"), 400 
    return render_template("login.html", form=login_form)        
## store async protobuf as blob when edited and keep cache in memory

@app.route("/logout", methods=["GET"])
@login_required
def logout():
    logout_user()
    return redirect("/login")
## search protobuf for feed data

## serve feed data

## serve user input webpages

## search for trips to modify


@login_manager.unauthorized_handler
def unauthorized():
    # do stuff
    return redirect("/login") 

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        # create admin user
        insert_user(ADMIN_USERNAME, ADMIN_PASS)
    app.run(debug=True)