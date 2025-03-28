
from gtfs_rt_server.protobuf_utils import delete_feed_entity_from_feed, save_feed_to_file,get_feed_object_from_file, save_feed_entity_to_feed,is_feed_entity_alert, is_feed_entity_trip_update,verify_service_alert, verify_trip_update
from flask import Blueprint,request , make_response, redirect, url_for, render_template, current_app
from google.protobuf.message import DecodeError, EncodeError
import  google.transit.gtfs_realtime_pb2  as gtfs_rt
from google.protobuf.json_format import  MessageToDict
from flask_login import login_required
from pathlib import Path

feed_bp = Blueprint("feeds", __name__, url_prefix="/feed")

import datetime

@feed_bp.get("/<type>")
def get_feed(type):

    feed_object = current_app.config["feed_alerts"]
    if type=="updates":
        feed_object = current_app.config["feed_updates"]
    elif type == "positions":
        feed_object = current_app.config["feed_positions"]

    feed_object.header.timestamp =int(datetime.datetime.now().timestamp())

    resp = make_response(feed_object.SerializeToString())
    resp.content_type = "application/octet-stream"
    return resp

@feed_bp.post("/trip_update")
@login_required
def trip_update():
    try:
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "updates.bin"
        feed_object = current_app.config["feed_updates"]
        entity = gtfs_rt.FeedEntity()
        entity.ParseFromString(request.data)
        entity_dict = MessageToDict(entity) 
        print("on server:",entity_dict)
        if not is_feed_entity_trip_update(entity_dict):
            return "Entity is not of type TripUpdate", 400
        verify_trip_update(entity_dict["tripUpdate"])
        save_feed_entity_to_feed(entity, feed_object)
        save_feed_to_file(feed_object,feed_location ) 
        return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        print("error server:", verify_error)
        return str(verify_error), 400

@feed_bp.post("/service_alert")
@login_required
def service_alert():
    
    try:
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "alerts.bin"
        feed_object = current_app.config["feed_alerts"]
        entity = gtfs_rt.FeedEntity()
        entity.ParseFromString(request.data)
        entity_dict = MessageToDict(entity) 
        print("on server:",entity_dict)
        if not is_feed_entity_alert(entity_dict):
            return "Entity is not of type Alert", 400
        verify_service_alert(entity_dict["alert"])
        save_feed_entity_to_feed(entity, feed_object)
        save_feed_to_file(feed_object, feed_location) 
        return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        print("error server:", verify_error)
        return str(verify_error), 400


@feed_bp.post("/vehicle_postion")
@login_required
def vehicle_postion():
    try:
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "positions.bin"
        feed_object = current_app.config["feed_positions"]
        entity = gtfs_rt.FeedEntity()
        entity.ParseFromString(request.data)
        entity_dict = MessageToDict(entity) 
        # print("on server:",entity_dict)
        # if not is_feed_entity_alert(entity_dict):
        #     return "Entity is not of type Alert", 400
        # verify_service_alert(entity_dict["alert"])
        # save_feed_entity_to_feed(entity, feed_object)
        # save_feed_to_file(feed_object, feed_location) 
        return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        print("error server:", verify_error)
        return str(verify_error), 400



@feed_bp.delete("/<type>/delete_feed_entity")
@login_required
def delete_feed_entity(type):

    feed_object = current_app.config["feed_alerts"]
    feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "alerts.bin"
    if type=="updates":
        feed_object = current_app.config["feed_updates"]
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "updates.bin"
    elif type == "positions":
        feed_object = current_app.config["feed_positions"]
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "positions.bin"


    entity_id = request.data.decode()
    delete_feed_entity_from_feed(entity_id, feed_object)
    save_feed_to_file(feed_object, feed_location)
    return "Successful"