import json
from gtfs_rt_server.protobuf_utils import delete_expired_trip_updates, get_feed_object_from_file, verify_vehicle_position,is_feed_entity_position,delete_feed_entity_from_feed, save_feed_to_file,get_feed_object_from_file, save_feed_entity_to_feed,is_feed_entity_alert, is_feed_entity_trip_update,verify_service_alert, verify_trip_update
from gtfs_rt_server import lock, scheduler, has_roles
from gtfs_rt_server.redis_utils import get_feed_from_redis, save_feed_to_redis 
from flask import Blueprint,request , make_response, redirect, url_for, render_template, current_app
from flask_login import  login_required 
from google.protobuf.message import DecodeError, EncodeError
from gtfs_rt_server.db_utils import delete_alert_from_log, delete_trip_update_from_log ,add_alert_to_db, add_trip_update_to_db
import  google.transit.gtfs_realtime_pb2  as gtfs_rt
from google.protobuf.json_format import  MessageToDict
from pathlib import Path

feed_bp = Blueprint("feeds", __name__, url_prefix="/feed")

import datetime

@feed_bp.get("/<type>")
def get_feed(type):
    feed_object= None 
    
    if type=="updates":
        feed_object = current_app.config["feed_updates"] 
    elif type == "alerts":
        feed_object = current_app.config["feed_alerts"]
    else:
        feed_object = current_app.config["feed_positions"]
        

    feed_object.header.timestamp =int(datetime.datetime.now().timestamp())

    resp = make_response(feed_object.SerializeToString())
    resp.content_type = "application/octet-stream"
    return resp

@feed_bp.post("/trip_update")
@login_required
@has_roles("edit")
def trip_update():
    try:
        with lock:
            feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "updates.bin"
            feed_object = current_app.config["feed_updates"]
            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            # print("on server:",entity_dict)
            if not is_feed_entity_trip_update(entity_dict):
                return "Entity is not of type TripUpdate", 400
            verify_trip_update(entity_dict["tripUpdate"])
            save_feed_entity_to_feed(entity, feed_object)
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
        with lock:
            feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "alerts.bin"
            feed_object = current_app.config["feed_alerts"]
            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            # print("on server:",entity_dict)
            if not is_feed_entity_alert(entity_dict):
                return "Entity is not of type Alert", 400
            verify_service_alert(entity_dict["alert"])
            save_feed_entity_to_feed(entity, feed_object)
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
        with lock:
            feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "positions.bin"
            feed_object = current_app.config["feed_positions"]
            entity = gtfs_rt.FeedEntity()
            entity.ParseFromString(request.data)
            entity_dict = MessageToDict(entity) 
            if not is_feed_entity_position(entity_dict):
                return "Entity is not of type VehiclePosition", 400
            verify_vehicle_position(entity_dict["vehicle"])  ## TODO: check this
            save_feed_entity_to_feed(entity, feed_object)
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
        feed_object = current_app.config["feed_alerts"]
        feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "alerts.bin"
        if type_entity=="updates":
            feed_object = current_app.config["feed_updates"]
            feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "updates.bin"
        elif type_entity == "positions":
            feed_object = current_app.config["feed_positions"]
            feed_location = Path(current_app.config["FEEDS_LOCATION"]) / "positions.bin"


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

@scheduler.task("interval", id="remove_old_trip_updates", seconds=30*60)
def periodic_remove_expired():
    with lock:
        with scheduler.app.app_context():
            scheduler.app.logger.debug("removing expired trip updates")
            print("removing expired trip updates")
            delete_expired_trip_updates(scheduler.app.config["feed_updates"]) # why not changing object
            save_feed_to_file(scheduler.app.config["feed_updates"], scheduler.app.config["feed_updates_location"])
    
