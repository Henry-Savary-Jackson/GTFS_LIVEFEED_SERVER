from flask import Blueprint,request 
from gtfs_rt_server.db_utils import get_trips, get_routes, get_stops, get_services,get_stoptimes_of_trip 
db_bp = Blueprint("db", __name__, url_prefix="/db")

@db_bp.get("/get_trips")
def get_trips_endp():
    service = request.args.get("service", None )
    route = request.args.get("route", None )
    number = request.args.get("number", None )
    return get_trips( service, route, number) 

@db_bp.get("/get_routes")
def get_routes_endp():
    return get_routes()

@db_bp.get("/get_stops")
def get_stops_endp():
    stop_name = request.args.get("stopname", None)
    return get_stops(stop_name=stop_name)

@db_bp.get("/get_services")
def get_servcies_endp():
    return get_services()

@db_bp.get("/get_stop_times_trip")
def get_stoptimes_endp():
    trip_id =request.args.get("tripid", None) 
    if trip_id is None:
        return "Please give a trip id." , 400
    return get_stoptimes_of_trip(trip_id)


