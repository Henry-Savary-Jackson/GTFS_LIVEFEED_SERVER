import os
from  google.protobuf.message import DecodeError, EncodeError
from google.protobuf.json_format import ParseDict, MessageToDict
import datetime
from flask import Flask,request , make_response, redirect, url_for, render_template
import argon2
import sqlite3
from  uuid import uuid4
from make_gtfs import generate_gtfs_zip, has_errors, add_gtfs_tables_to_db
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from flask_login import login_required, login_user, current_user, logout_user
from config import * 
from db_utils import get_user_by_username, insert_user, get_trips
from wtforms import BooleanField, StringField,RadioField,SearchField,PasswordField, validators, SubmitField, FileField
from flask_wtf import FlaskForm
from protobuf_utils import delete_feed_entity_from_feed, save_feed_to_file,get_feed_object_from_file, save_feed_entity_to_feed,is_feed_entity_alert, is_feed_entity_trip_update,verify_service_alert, verify_trip_update

feed_object = get_feed_object_from_file() 

class GTFSFileUploadForm(FlaskForm):
    file = FileField(label="Upload GTFS file", validators=[validators.DataRequired() ])
    submit = SubmitField()

class LoginForm(FlaskForm):
    username= StringField(label="Username", validators=[validators.DataRequired()])
    password = PasswordField(label="Password", validators=[validators.DataRequired() ])
    remember_me = BooleanField(label="Remember me", default=True, validators=[validators.DataRequired()])
    submit = SubmitField('Login')

class SearchTripForm(FlaskForm):
    service = RadioField(label="Service")
    route = RadioField(label="Route")
    trip = SearchField(label="Search trip")
    submit = SubmitField("Search") 

    def __init__(self,routes, services ,*args,**kwargs):
        self.service.choices=services
        self.route.choices=routes
        super().__init__(*args, **kwargs)
        

@app.route("/feed", methods=["GET"])
def get_feed():
    return feed_object.SerializeToString()


@app.route("/trip_update", methods=["POST"])
def trip_update():
    try:
        entity = gtfs_rt.FeedEntity()
        entity.ParseFromString(request.data)
        entity_dict = MessageToDict(entity) 
        if not is_feed_entity_trip_update(entity_dict):
            return "Entity is not of type TripUpdate", 400
        verify_trip_update(entity["trip_update"])
        save_feed_entity_to_feed(entity, feed_object)
        save_feed_to_file(feed_object) 
        return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400

@app.route("/service_alert", methods=["POST"])
def service_alert():
    try:
        entity = gtfs_rt.FeedEntity()
        entity.ParseFromString(request.data)
        entity_dict = MessageToDict(entity) 
    
        if not is_feed_entity_alert(entity_dict):
            return "Entity is not of type Alert", 400
        verify_service_alert(entity_dict["alert"])
        save_feed_entity_to_feed(entity, feed_object)
        save_feed_to_file(feed_object) 
        return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400

@app.route("/delete_feed_entity", methods=["DELETE"])
@login_required
def delete_feed_entity():
    entity_id = request.data
    delete_feed_entity_from_feed(entity_id, feed_object)
    return "Successful"


@app.route("/", methods=["GET"])
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
    print(login_form.data)
    if request.method == "POST" and login_form.validate_on_submit():
        user = get_user_by_username(login_form.data["username"])
        if not user:
            return render_template("login.html", form=login_form,error="No such user") , 400
        print(user, user.username)
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


@app.route("/get_trips", methods=["GET"])
def get_trips_endp():
    service = request.args.get("service", None )
    route = request.args.get("route", None )
    number = request.args.get("number", None )
    return get_trips( service, route, number) 


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