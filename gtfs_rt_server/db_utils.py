from gtfs_rt_server import db
from gtfs_rt_server.schema import User
from sqlalchemy import text 
from typing import Optional
from argon2 import PasswordHasher

def get_password_hasher():
    return PasswordHasher()

password_hasher = get_password_hasher()

def insert_user(username, rawPassword):
    user = User(username=username, hash_pass=password_hasher.hash(rawPassword))
    try : 
        with db.session.begin() :
            db.session.add(user)
            db.session.commit()
    except Exception as e:
        db.session.rollback()

def get_trips( service=None, route=None, number=None, time_after=None):
    with db.session.begin():
        sql = "SELECT trip_id FROM trips "
        if service or route or number or time_after:
            sql += " WHERE "
        if service:
            sql += " service_id = :service "
            if route or number:
                sql += " AND "
        if route:
            sql += " route_id = :route " 
            if number:
                sql += "AND "
        if number:
            sql += "  trip_id LIKE :tripid "
            if time_after:
                sql += " AND "
        if time_after:
            sql += " arrival_time >= :time_after   "
        params = dict()
        params["service"] = service
        params["route"] =route 
        params["tripid"] =f"%-{number}%" 
        params["time_after"] =  time_after
        trips = db.session.execute(text(sql),params=params ).fetchall()
        return [trip[0] for trip in trips] 

def get_stops(stop_name=None):
    with db.session.begin():
        sql = "SELECT stop_id, stop_name FROM stops "
        params = dict()
        if stop_name:
            sql += " WHERE stop_name LIKE :stop_name"
            params["stop_name"] = f"%{stop_name}%"

        stops= db.session.execute(text(sql), params).fetchall();
        return [ list(stop) for stop in stops ]

def get_trip_ids_routes():
    # create dict of trips to their route
    with db.session.begin():
        sql = "SELECT trip_id , route_id FROM trips "
        rows = db.session.execute(text(sql)).fetchall();
        return { row[0]: row[1] for row in rows}

def get_routes():
    with db.session.begin():
        sql = "SELECT route_id, route_long_name FROM routes "
        routes = db.session.execute(text(sql)).fetchall();
        return [ list(route) for route in routes ]


def get_services():
    with db.session.begin():
        services = db.session.execute(text("SELECT service_id FROM calendar ")).fetchall();
        return [ service[0] for service in services ]

def get_number_of_stoptimes(trip_id):
    with db.session.begin():
        count = db.session.execute(text("SELECT COUNT(*) FROM stop_times WHERE trip_id = :trip_id"),{"trip_id":trip_id}).fetchall()
        return count[0][0]

def get_stoptimes_of_trip(trip_id):
    print(trip_id, "checking")
    with db.session.begin():
        stoptimes = db.session.execute(text("SELECT stop_sequence, stop_id, strftime(\'%H:%M:%S\', arrival_time) as arrival FROM stop_times WHERE trip_id = :trip_id"),{"trip_id":trip_id}).fetchall()
        return [ list(stoptime) for stoptime in stoptimes ] 

def route_exists(route_id):
    print(route_id, "checking")
    with db.session.begin():
        result = db.session.execute(text("SELECT 1 FROM routes WHERE route_id = :route_id"),{"route_id":route_id}).fetchall()
        return bool(result)

def stop_exists(stop_id):
    print(stop_id, "checking")
    with db.session.begin():
        result = db.session.execute(text("SELECT 1 FROM stops WHERE stop_id = :stop_id"),{"stop_id":stop_id}).fetchall()
        return bool(result)

def stop_on_route(stop_id, route_id):
    print(stop_id, route_id, "checking")
    with db.session.begin():
        result = db.session.execute(text("SELECT 1 FROM stop_times INNER JOIN trips ON stop_times.trip_id = trips.trip_id WHERE stop_id = :stop_id AND route_id = :route_id"),{"stop_id":stop_id, "route_id":route_id}).fetchall()
        return bool(result)

def trip_exists(trip_id):
    with db.session.begin():
        result = db.session.execute(text("SELECT 1 FROM trips WHERE trip_id = :trip_id "),{"trip_id":trip_id}).fetchall()
        return bool(result)

def agency_exists(agency_id):
    with db.session.begin():
        result = db.session.execute(text("SELECT 1 FROM agency WHERE agency_id = :agency_id "),{"agency_id":agency_id}).fetchall()
        return bool(result)

