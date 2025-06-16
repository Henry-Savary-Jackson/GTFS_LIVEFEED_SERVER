from flask import Blueprint,request , jsonify
import datetime
from flask_login import login_required
from gtfs_rt_server.db_utils import get_trips, get_routes, get_trip_ids_routes,  get_stops, get_services,get_stoptimes_of_trip, get_alerts_by_causes, get_alerts_by_effects, get_alerts_by_route, get_alerts_by_stop, get_alerts_by_trips, get_trip_updates_by_routes, get_trip_updates_by_stops, get_trip_updates_by_trips 
db_bp = Blueprint("db", __name__, url_prefix="/db")

@db_bp.get("/get_trips")
def get_trips_endp():
    service = request.args.get("service", None )
    route = request.args.get("route", None )
    number = request.args.get("number", None )
    time_after = request.args.get("after", None )
    return get_trips( service, route, number, time_after ) 

@db_bp.get("/trips_to_routes")
def get_trips_to_routes():
    return get_trip_ids_routes()

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


@db_bp.post("/add_alert")
@login_required
def add_alert_endp():
    alert = request.get_json()
    if not alert:
        return {"error": "Missing alert JSON"}, 400
    add_alert_to_db(alert)
    return {"status": "ok"}

@db_bp.post("/add_trip_update")
@login_required
def add_trip_update_endp():
    trip_update = request.get_json()
    if not trip_update:
        return {"error": "Missing trip update JSON"}, 400
    add_trip_update_to_db(trip_update)
    return {"status": "ok"}

@db_bp.delete("/delete_alert/<alert_id>")
@login_required
def delete_alert_endp(alert_id):
    delete_alert_from_log(alert_id)
    return {"status": "deleted", "alert_id": alert_id}

@db_bp.delete("/delete_trip_update/<trip_update_id>")
@login_required
def delete_trip_update_endp(trip_update_id):
    delete_trip_update_from_log(trip_update_id)
    return {"status": "deleted", "trip_update_id": trip_update_id}

@db_bp.get("/alerts_by_trips")
def alerts_by_trips_endp():
    return jsonify(get_alerts_by_trips().to_dict(orient="records"))

@db_bp.get("/alerts_by_routes")
def alerts_by_routes_endp():
    return jsonify(get_alerts_by_route().to_dict(orient="records"))

@db_bp.get("/alerts_by_stops")
def alerts_by_stops_endp():
    return jsonify(get_alerts_by_stop().to_dict(orient="records"))

@db_bp.get("/trip_updates_by_trips")
def trip_updates_by_trips_endp():
    return jsonify(get_trip_updates_by_trips().to_dict(orient="records"))

@db_bp.get("/trip_updates_by_routes")
def trip_updates_by_routes_endp():
    return jsonify(get_trip_updates_by_routes().to_dict(orient="records"))

@db_bp.get("/trip_updates_by_stops")
def trip_updates_by_stops_endp():
    return jsonify(get_trip_updates_by_stops().to_dict(orient="records"))
