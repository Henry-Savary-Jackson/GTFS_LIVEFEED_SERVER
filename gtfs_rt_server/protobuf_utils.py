from google.transit import gtfs_realtime_pb2 as gtfs_rt
import os
from google.protobuf.json_format import ParseDict, MessageToDict
import datetime
from gtfs_rt_server.db_utils import (
    agency_exists,
    get_number_of_stoptimes,
    get_stoptimes_of_trip,
    trip_exists,
    stop_on_route,
    stop_exists,
    route_exists
)


def get_empty_feed_message():
    fm = gtfs_rt.FeedMessage()
    fm.CopyFrom(
        ParseDict(
            {
                "header": {
                    "incrementality": "FULL_DATASET",
                    "gtfs_realtime_version": "2.0",
                    "timestamp": int(datetime.datetime.now().timestamp()),
                }
            },
            gtfs_rt.FeedMessage(),
        )
    )

    return fm


def get_feed_object_from_file(feed_location):
    if not os.path.exists(feed_location):
        feed = get_empty_feed_message()
        save_feed_to_file(feed, feed_location)
        return feed

    with open(feed_location, "rb") as feed_bin:
        feed_object = gtfs_rt.FeedMessage()
        feed_object.ParseFromString(feed_bin.read())
        feed_object.header.timestamp = int(
            datetime.datetime.now().timestamp()
        )  # makes sure it stays at latest version
        return feed_object


def save_feed_to_file(feed_message: gtfs_rt.FeedMessage, feed_location):
    with open(feed_location, "wb") as feed_bin:
        # print(feed_message, feed_location)
        feed_bin.write(feed_message.SerializeToString())


def is_feed_entity_alert(entity: dict):
    return "alert" in entity

def is_feed_entity_position(entity:dict):
    return "vehicle" in entity


def is_feed_entity_trip_update(entity: dict):
    return "tripUpdate" in entity


def save_feed_entity_to_feed(
    save_entity: gtfs_rt.FeedEntity, feed: gtfs_rt.FeedMessage
):
    for i, f_entity in enumerate(feed.entity):
        if f_entity.id == save_entity.id:
            del feed.entity[i]
            feed.entity.insert(i, save_entity)
            return

    feed.entity.insert(0,save_entity)


def delete_feed_entity_from_feed(entity_id: str, feed: gtfs_rt.FeedMessage):
    for i, f_entity in enumerate(feed.entity):
        print(f_entity.id, entity_id)
        if f_entity.id == entity_id:
            print("deleting", f_entity.id, entity_id)
            del feed.entity[i]

def verify_vehicle_position(position: dict):
    if "trip" not in position :
        raise ValueError("You must specifiy the trip_id in the Vehicle positions!")
    verify_trip_descriptor(position["trip"])

def verify_service_alert(alert: dict):
    if "informedEntity" not in alert:
        raise ValueError("You must specifiy affected entities in the service alert!")
    for informed_entity in alert["informedEntity"]:
        verify_entity_selector(informed_entity)


def verify_trip_descriptor(trip_desc: dict):
    if "tripId" not in trip_desc:
        raise ValueError("You must use trip_id in your trip update's trip descriptor.")
    if not trip_exists(trip_desc["tripId"]):
        raise ValueError(f'Trip with trip_id "{trip_desc["tripId"]}" doesn\'t exist.')
    return trip_desc["tripId"]

def timeStrToTime(time_str):
    hour, minute, second = list( map(int, time_str.split(":")))
    newTime = datetime.time(hour, minute, second)
    return newTime

def verify_trip_update(trip_update: dict):
    trip_id = verify_trip_descriptor(trip_update["trip"])
    stoptimes = get_stoptimes_of_trip(trip_id)
    number_stop_times = len(stoptimes) 
    if number_stop_times <= 0:
        raise ValueError(f"Trip {trip_id} doesn't exist or trip has no stoptimes.")
    if "stopTimeUpdate" not in trip_update:
        return
    for stop_time_update in trip_update["stopTimeUpdate"]:

        if "stopSequence" not in stop_time_update:
            raise ValueError(f"A stop time update needs the stop_sequence.")
        if stop_time_update["stopSequence"] > number_stop_times:
            raise ValueError(
                f"Invalid stop_sequence exceeds the number of stop times in the trip {trip_id}."
            )
        if "arrival" in stop_time_update :
            stop_sequence = stop_time_update["stopSequence"]
            current_stoptime =stoptimes[stop_sequence ]
            prev_stoptime = stoptimes[stop_sequence -1 ] if stop_sequence  > 0 else None
            if prev_stoptime:
                arrival = stop_time_update["arrival"]
                time_prev_scheduled = timeStrToTime(prev_stoptime["arrival"])

                if "time" in arrival:

                    time_arrival = datetime.datetime.fromtimestamp(int(arrival["time"])).time()
                    if (time_arrival < time_prev_scheduled):
                        raise ValueError(f"The new time for arrival {time_arrival.isoformat()} of stop {stoptimes[stop_sequence]["stopId"]} is less than the arrival of the previous stop {prev_stoptime["stopId"]} {time_prev_scheduled.isoformat()} ")
                elif "delay" in arrival:
                    delay = arrival["delay"]
                    scheduled_time = datetime.time.fromisoformat(current_stoptime["arrival"])
                    new_time = (datetime.datetime.combine(datetime.date.today(), scheduled_time) + datetime.timedelta(seconds= delay)).time()
                    if new_time < time_prev_scheduled:
                        raise ValueError(f"The new time for arrival {(new_time).isoformat()} of stop {stoptimes[stop_sequence]["stopId"]} is less than the arrival of the previous stop {prev_stoptime["stopId"]} {time_prev_scheduled.isoformat()} ")
        elif stop_time_update["scheduleRelationship"] != "SKIPPED":
            raise ValueError(f" No trip update information in stoptime update for stop {stoptimes[stop_sequence]["stopId"]}")


def verify_entity_selector(informed_entity: dict):
    has_agency_id = "agencyId" in informed_entity
    has_route = "routeId" in informed_entity
    has_stop_id = "stopId" in informed_entity
    has_trip_desc = "trip" in informed_entity
    if has_agency_id:
        if not agency_exists(informed_entity["agencyId"]):
            raise ValueError(
                f'No such agency with agency_id "{informed_entity["agencyId"]}".'
            )
    elif has_route and has_stop_id:
        if not stop_on_route(informed_entity["stopId"], informed_entity["routeId"]):
            raise ValueError(
                f'No such stop "{informed_entity["stopId"]}" is on route "{informed_entity["routeId"]}".'
            )
    elif has_route:
        if not route_exists(informed_entity["routeId"]):
            raise ValueError(
                f'Route with route_id  "{informed_entity["routeId"]}" doesn\'t exist.'
            )
    elif has_stop_id:
        if not stop_exists(informed_entity["stopId"]):
            raise ValueError(
                f'Stop with stop_id "{informed_entity["stopId"]}" doesn\'t exist.'
            )
    elif has_trip_desc:
        verify_trip_descriptor(informed_entity["trip"])
    else:
        raise ValueError("Invalid entity selector.")

def get_total_delay(stoptimes, stoptimeUpdates):
    totalDelay = 0
    for stoptime_update in stoptimeUpdates:
        arrival = stoptime_update.arrival
        index = stoptime_update.stop_sequence
        time = datetime.time.fromisoformat(stoptimes[index]["arrival"])
        if hasattr(arrival, "time") and arrival.time:
            datetime_stoptime = datetime.datetime.fromtimestamp(arrival.time)
            datetime_scheduled = datetime.datetime.combine(datetime_stoptime.date(), time)
            diff = datetime_stoptime - datetime_scheduled
            totalDelay += diff.total_seconds() 
        if hasattr(arrival, "delay") and arrival.delay:
            totalDelay = arrival.delay
    return totalDelay

def delete_expired_trip_updates(feed ):
    print("starting deleting")
    for i, f_entity in enumerate(feed.entity):
        trip_update = f_entity.trip_update
        trip_id = trip_update.trip.trip_id
        stoptimes = get_stoptimes_of_trip(trip_id)
        total_delay = get_total_delay(stoptimes, trip_update.stop_time_update)
        # print(trip_id, total_delay, datetime.datetime.combine( datetime.date.today(),datetime.time.fromisoformat(stoptimes[-1]["arrival"])) + datetime.timedelta(seconds=total_delay) + datetime.timedelta(hours=1) )
        if datetime.datetime.now() > datetime.datetime.combine( datetime.date.today(),datetime.time.fromisoformat(stoptimes[-1]["arrival"])) + datetime.timedelta(seconds=total_delay) + datetime.timedelta(hours=1):
            print("deleted:", trip_id, total_delay)
            del feed.entity[i] 
    # i = 0