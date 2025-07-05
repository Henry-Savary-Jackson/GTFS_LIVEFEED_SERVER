import json
from gtfs_rt_server.protobuf_utils import save_feed_to_file_data, delete_expired_trip_updates, get_feed_object_from_file, verify_vehicle_position,is_feed_entity_position,delete_feed_entity_from_feed, save_feed_to_file,get_feed_object_from_file, save_feed_entity_to_feed,is_feed_entity_alert, is_feed_entity_trip_update,verify_service_alert, verify_trip_update
from gtfs_rt_server import lock,  has_roles
from flask import Blueprint,request , make_response, redirect, url_for, render_template, current_app
from flask_login import  login_required 
from google.protobuf.message import DecodeError, EncodeError
from gtfs_rt_server.db_utils import delete_alert_from_log, delete_trip_update_from_log ,add_alert_to_db, add_trip_update_to_db
import  google.transit.gtfs_realtime_pb2  as gtfs_rt
from google.protobuf.json_format import  MessageToDict
from pathlib import Path
from gtfs_rt_server.redis_utils import get_feed_lock

from celery import shared_task
feed_bp = Blueprint("feeds", __name__, url_prefix="/feed")

import datetime


@feed_bp.get("/<type>")
def get_feed(type):
    feed_object= None 
    if type=="updates":
        feed_object =  get_feed_object_from_file(current_app.config["feed_updates_location"])
    elif type == "alerts":
        feed_object =  get_feed_object_from_file(current_app.config["feed_alerts_location"])
    else:
        feed_object =  get_feed_object_from_file(current_app.config["feed_positions_location"])
    feed_object.header.timestamp =int(datetime.datetime.now().timestamp())

    resp = make_response(feed_object.SerializeToString())
    resp.content_type = "application/octet-stream"
    return resp

@feed_bp.post("/trip_update")
@login_required
@has_roles("edit")
def trip_update():
    try:
        with get_feed_lock("updates"): 
            feed_location = current_app.config["feed_updates_location"]
            feed_object =  get_feed_object_from_file(feed_location)

            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            # print("on server:",entity_dict)
            if not is_feed_entity_trip_update(entity_dict):
                return "Entity is not of type TripUpdate", 400
            verify_trip_update(entity_dict["tripUpdate"])
            save_feed_entity_to_feed(entity, feed_object)
            # save_feed_to_redis(feed_object,"updates" ) 
            save_feed_to_file(feed_object,feed_location ) 
            if "LogEntity"  in request.headers and request.headers["LogEntity"]:
                add_trip_update_to_db(entity_dict["id"], entity_dict["tripUpdate"])
            return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        # print("error server:", verify_error)
        return str(verify_error), 400

@feed_bp.post("/service_alert")
@login_required
@has_roles("edit")
def service_alert():
    try:
        with get_feed_lock("alerts"):
            feed_location = current_app.config["feed_alerts_location"]
            feed_object = get_feed_object_from_file(feed_location)

            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            # print("on server:",entity_dict)
            if not is_feed_entity_alert(entity_dict):
                return "Entity is not of type Alert", 400
            verify_service_alert(entity_dict["alert"])
            save_feed_entity_to_feed(entity, feed_object)
            # save_feed_to_redis(feed_object,"alerts" ) 
            save_feed_to_file(feed_object, feed_location) 
            # add to log
            if "LogEntity"  in request.headers and request.headers["LogEntity"]:
                add_alert_to_db(entity_dict["id"], entity_dict["alert"])
            return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        # print("error server:", verify_error)
        return str(verify_error), 400


@feed_bp.post("/vehicle_postion")
@login_required
@has_roles("edit")
def vehicle_postion():
    try:
        with get_feed_lock("positions"):
            feed_location = current_app.config["feed_positions_location"]
            feed_object =  get_feed_object_from_file(feed_location)
            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            if not is_feed_entity_position(entity_dict):
                return "Entity is not of type VehiclePosition", 400
            verify_vehicle_position(entity_dict["vehicle"])  ## TODO: check this
            save_feed_entity_to_feed(entity, feed_object)
            # save_feed_to_redis(feed_object,"positions" ) 
            save_feed_to_file(feed_object, feed_location) 
            return "Successful"
    except DecodeError as d_err :
        return f"Invalid Protobuf Message format:\n{d_err}",400
    except ValueError as verify_error:
        print("error server:", verify_error)
        return str(verify_error), 400



@feed_bp.delete("/<type_entity>/delete_feed_entity")
@login_required
@has_roles("edit")
def delete_feed_entity(type_entity):
    with lock:
        feed_location = ""

        if type_entity=="updates":
            feed_location = current_app.config["feed_updates_location"]
        elif type_entity == "alerts":
            feed_location = current_app.config["feed_alerts_location"]
        else:
            feed_location = current_app.config["feed_positions_location"]

        with get_feed_lock(type_entity): 
            feed_object =  get_feed_object_from_file(feed_location)

            request_data = json.loads(request.data.decode())
            if "entity_id" not in request_data:
                return "No entity ID given " , 400
            entity_id = request_data["entity_id"] 
            delete_from_log = request_data["deleteFromLog"] 
            delete_feed_entity_from_feed(entity_id, feed_object)
            save_feed_to_file(feed_object, feed_location)
            if delete_from_log:
                if type_entity == "alerts":
                    delete_alert_from_log(entity_id)
                else:
                    delete_trip_update_from_log(entity_id)

    return "Successful"

