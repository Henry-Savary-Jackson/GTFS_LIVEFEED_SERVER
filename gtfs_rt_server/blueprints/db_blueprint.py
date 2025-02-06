from flask import Blueprint,request 
from gtfs_rt_server.db_utils import get_trips
db_bp = Blueprint("db", __name__, url_prefix="/db")

@db_bp.get("/get_trips")
def get_trips_endp():
    service = request.args.get("service", None )
    route = request.args.get("route", None )
    number = request.args.get("number", None )
    return get_trips( service, route, number) 



