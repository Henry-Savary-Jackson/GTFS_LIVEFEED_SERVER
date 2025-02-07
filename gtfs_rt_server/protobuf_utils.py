from google.transit import gtfs_realtime_pb2 as gtfs_rt
import os
from google.protobuf.json_format import ParseDict, MessageToDict
import datetime
from gtfs_rt_server.db_utils import agency_exists, get_number_of_stoptimes,trip_exists,stop_on_route, stop_exists, route_exists

def get_empty_feed_message():
    fm = gtfs_rt.FeedMessage()
    fm.CopyFrom (ParseDict(
        {
        "header": {
            "incrementality": "FULL_DATASET",
            "gtfs_realtime_version": "2.0",
            "timestamp": int(datetime.datetime.now().timestamp()),
        }
        },
        gtfs_rt.FeedMessage(),
    ))

    return fm 

def get_feed_object_from_file(feed_location):
    if not os.path.exists(feed_location):
        feed = get_empty_feed_message()
        save_feed_to_file(feed, feed_location)
        return feed

    with open(feed_location, "rb") as feed_bin:
        feed_object = gtfs_rt.FeedMessage()
        feed_object.ParseFromString(feed_bin.read())
        return feed_object


def save_feed_to_file(feed_message: gtfs_rt.FeedMessage, feed_location):
    with open(feed_location, "wb") as feed_bin:
        feed_bin.write(feed_message.SerializeToString())

def is_feed_entity_alert(entity: dict ):
    return  "alert" in entity 

def is_feed_entity_trip_update(entity: dict):
    return  "tripUpdate" in entity 

def save_feed_entity_to_feed(save_entity:gtfs_rt.FeedEntity, feed: gtfs_rt.FeedMessage):
    for i, f_entity in enumerate(feed.entity):
        if f_entity.id == save_entity.id:
            feed.entity[i] = save_entity
            return
    
    feed.entity.append(save_entity)

def delete_feed_entity_from_feed(entity_id:str, feed: gtfs_rt.FeedMessage):
    for i, f_entity in enumerate(feed.entity):
        print(f_entity.id, entity_id)
        if f_entity.id == entity_id:
            print("deleting", f_entity.id, entity_id)
            del feed.entity[i]

def verify_service_alert(alert: dict):
    for informed_entity in alert["informedEntity"]:
        verify_entity_selector(informed_entity)

def verify_trip_descriptor(trip_desc:dict):
    if "tripId" not in trip_desc:
        raise ValueError("You must use trip_id in your trip update's trip descriptor.")
    if not trip_exists(trip_desc["tripId"]) :
        raise ValueError(f"Trip with trip_id \"{trip_desc["tripId"]}\" doesn't exist.")
    return trip_desc["tripId"]

def verify_trip_update(trip_update:dict):
    trip_id =  verify_trip_descriptor(trip_update["trip"])
    number_stop_times =get_number_of_stoptimes(trip_id)
    if number_stop_times <= 0:
        raise ValueError(f"Trip {trip_id} doesn't exist or trip has no stoptimes.") 
    if "stopTimeUpdate" not in trip_update:
        return 
    for stop_time_update in trip_update["stopTimeUpdate"]:
        if "stopSequence" not in stop_time_update : 
            raise ValueError(f"A stop time update needs the stop_sequence.")
        if stop_time_update["stopSequence"] > number_stop_times:
            raise ValueError(f"Invalid stop_sequence exceeds the number of stop times in the trip {trip_id}.") 
    

def verify_entity_selector(informed_entity:dict):
    has_agency_id = "agencyId" in informed_entity
    has_route =  "routeId" in informed_entity
    has_stop_id = "stopId" in informed_entity
    has_trip_desc = "trip" in informed_entity 
    if has_agency_id:
        if not agency_exists(informed_entity["agencyId"]):
            raise ValueError(f"No such agency with agency_id \"{informed_entity["agencyId"]}\".")
    elif has_route and has_stop_id:
        if not stop_on_route(informed_entity["stopId"], informed_entity["routeId"]):
            raise ValueError(f"No such stop \"{informed_entity["stopId"]}\" is on route \"{informed_entity["routeId"]}\".")
    elif has_route :
        if not route_exists(informed_entity["routeId"]):
            raise ValueError(f"Route with route_id  \"{informed_entity["routeId"]}\" doesn't exist.")
    elif has_stop_id:
        if not stop_exists(informed_entity["stopId"]):
            raise ValueError(f"Stop with stop_id \"{informed_entity["stopId"]}\" doesn't exist.")
    elif has_trip_desc:
        verify_trip_descriptor(informed_entity["trip"])
    else:
        raise ValueError("Invalid entity selector.") 

