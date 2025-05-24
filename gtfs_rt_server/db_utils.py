from gtfs_rt_server import db
from sqlalchemy.dialects.sqlite import insert
import pandas as pd
from pathlib import Path
import datetime
import openpyxl
from gtfs_rt_server.schema import User, TripUpdate, Alert, EntityTypes, Causes, Effects
from sqlalchemy import text, func
from typing import Optional
from argon2 import PasswordHasher
from flask import current_app


def get_password_hasher():
    return PasswordHasher()


password_hasher = get_password_hasher()

def get_route_id_of_trip(trip_id):
    with db.session.begin():
        return db.session.execute(   text("SELECT route_id FROM trips WHERE trip_id = :trip_id"),
            {"trip_id": trip_id},
        ).fetchall()[0][0]

        

def insert_user(username, rawPassword):
    user = User(username=username, hash_pass=password_hasher.hash(rawPassword))
    try:
        with db.session.begin():
            db.session.add(user)
            db.session.commit()
    except Exception as e:
        db.session.rollback()


def get_trips(service=None, route=None, number=None, time_after=None):
    with db.session.begin():
        sql = "SELECT DISTINCT trips.trip_id FROM trips "
        if time_after:
            sql += " INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id "
        if service or route or number or time_after:
            sql += " WHERE "
        if service:
            sql += " service_id = :service "
            if route or number or time_after:
                sql += " AND "
        if route:
            sql += " route_id = :route "
            if number or time_after:
                sql += "AND "
        if number:
            sql += "  trips.trip_id LIKE :tripid "
            if time_after:
                sql += " AND "
        if time_after:
            sql += " arrival_time >= :time_after   "
        params = dict()
        params["service"] = service
        params["route"] = route
        params["tripid"] = f"%-{number}%"
        params["time_after"] = time_after
        trips = db.session.execute(text(sql), params=params).fetchall()
        return [trip[0] for trip in trips]


def get_stops(stop_name=None):
    with db.session.begin():
        sql = "SELECT stop_id, stop_name FROM stops "
        params = dict()
        if stop_name:
            sql += " WHERE stop_name LIKE :stop_name"
            params["stop_name"] = f"%{stop_name}%"

        stops = db.session.execute(text(sql), params).fetchall()
        return [list(stop) for stop in stops]


def get_trip_ids_routes():
    # create dict of trips to their route
    with db.session.begin():
        sql = "SELECT trip_id , route_id FROM trips "
        rows = db.session.execute(text(sql)).fetchall()
        return {row[0]: row[1] for row in rows}


def get_routes():
    with db.session.begin():
        sql = "SELECT route_id, route_long_name FROM routes "
        routes = db.session.execute(text(sql)).fetchall()
        return [list(route) for route in routes]


def get_services():
    with db.session.begin():
        services = db.session.execute(
            text("SELECT service_id FROM calendar ")
        ).fetchall()
        return [service[0] for service in services]


def get_number_of_stoptimes(trip_id):
    with db.session.begin():
        count = db.session.execute(
            text("SELECT COUNT(*) FROM stop_times WHERE trip_id = :trip_id"),
            {"trip_id": trip_id},
        ).fetchall()
        return count[0][0]


def get_stoptimes_of_trip(trip_id):
    # print(trip_id, "checking")
    with db.session.begin():
        stoptimes = db.session.execute(
            text(
                "SELECT stop_sequence, stop_id, strftime('%H:%M:%S', arrival_time) as arrival FROM stop_times WHERE trip_id = :trip_id"
            ),
            {"trip_id": trip_id},
        ).fetchall()
        return [list(stoptime) for stoptime in stoptimes]


def route_exists(route_id):
    # print(route_id, "checking")
    with db.session.begin():
        result = db.session.execute(
            text("SELECT 1 FROM routes WHERE route_id = :route_id"),
            {"route_id": route_id},
        ).fetchall()
        return bool(result)


def stop_exists(stop_id):
    # print(stop_id, "checking")
    with db.session.begin():
        result = db.session.execute(
            text("SELECT 1 FROM stops WHERE stop_id = :stop_id"), {"stop_id": stop_id}
        ).fetchall()
        return bool(result)


def stop_on_route(stop_id, route_id):
    # print(stop_id, route_id, "checking")
    with db.session.begin():
        result = db.session.execute(
            text(
                "SELECT 1 FROM stop_times INNER JOIN trips ON stop_times.trip_id = trips.trip_id WHERE stop_id = :stop_id AND route_id = :route_id"
            ),
            {"stop_id": stop_id, "route_id": route_id},
        ).fetchall()
        return bool(result)


def trip_exists(trip_id):
    with db.session.begin():
        result = db.session.execute(
            text("SELECT 1 FROM trips WHERE trip_id = :trip_id "), {"trip_id": trip_id}
        ).fetchall()
        return bool(result)


def agency_exists(agency_id):
    with db.session.begin():
        result = db.session.execute(
            text("SELECT 1 FROM agency WHERE agency_id = :agency_id "),
            {"agency_id": agency_id},
        ).fetchall()
        return bool(result)


# given an alert's id , delete it from the database
def delete_alert_from_log(alert_id):
    with db.session.begin():
        db.session.execute(db.delete(Alert).where(Alert.alert_id == alert_id))
        db.session.commit()


# given a tripUpdates's id , delete it from the database
def delete_trip_update_from_log(trip_update_id):
    with db.session.begin():
        db.session.execute(
            db.delete(TripUpdate).where(TripUpdate.trip_update_id == trip_update_id)
        )
        db.session.commit()


# given a json object of an alert, add or update into database
def add_alert_to_db(id, alert):

    alert_data = {
        "alert_id": id,
        "start_time": alert["start_time"],
        "end_time": alert["end_time"],
        "cause": getattr(Causes, alert["cause"]),
        "effect": getattr(Effects, alert["effect"]),
    }

    stmt = (
        insert(Alert)
        .values(**alert_data)
        .on_conflict_do_update(index_elements=["alert_id"], set_=alert_data)
    )

    with db.session.begin():
        db.session.execute(stmt)
        db.session.query(InformedEntityToAlerts).filter_by(
            alert_id=alert_data["alert_id"]
        ).delete()

        for entity in alert.get("informed_entities", []):

            entity_type = EntityTypes.trips
            entity_id = ""
            if "tripId" in entity:
                entity_id = entity["tripId"]
            if "stopId" in entity:
                entity_type = EntityTypes.stops
                entity_id = entity["stopId"]
            if "routeId" in entity:
                entity_type = EntityTypes.routes
                entity_id = entity["routeId"]

            db.session.add(
                InformedEntityToAlerts(
                    alert_id=alert_data["alert_id"],
                    entity_id=entity_id,
                    entity_type=entity_type,
                )
            )


# given a json object of a trip update, add or update into database
def add_trip_update_to_db(id,trip_update):

    update_data = {
        "trip_update_id": id,
        "trip_id": trip_update["trip"]["tripId"],
        "cancelled": trip_update.get("cancelled", False),
    }
    update_data["route_id"] = get_route_id_of_trip(update_data["trip_id"])

    stmt = (
        insert(TripUpdate)
        .values(**update_data)
        .on_conflict_do_update(index_elements=["trip_update_id"], set_=update_data)
    )

    with db.session.begin():
        db.session.execute(stmt)
        db.session.query(TripUpdateToStop).filter_by(
            alert_id=trip_update["trip_update_id"]
        ).delete()

        for stop_update in trip_update.get("stopTimeUpdates", []):
            db.session.add(
                TripUpdateToStop(
                    alert_id=update_data["trip_update_id"],
                    stop_id=stop_update["stopId"],
                    delay=stop_update["arrival"].get("delay", None),
                    skipped=stop_update.get("skip", False),
                )
            )

## TODO change capitals

#  create a result as pandas dataframe, where you group the count of alerts by trips
def get_alerts_by_trips():
    result = (
        db.session.query(
            InformedEntityToAlerts.entity_id,
            func.count(InformedEntityToAlerts.alert_id).label("alert_count"),
        )
        .filter(InformedEntityToAlerts.entity_type == EntityTypes.trips)
        .group_by(InformedEntityToAlerts.entity_id)
        .all()
    )

    # return list(result)

    return pd.DataFrame(result, columns=["trip_id", "alert_count"])


#  create a result as pandas dataframe, where you group the count of alerts by route
def get_alerts_by_route():
    result = (
        db.session.query(
            InformedEntityToAlerts.entity_id,
            func.count(InformedEntityToAlerts.alert_id).label("alert_count"),
        )
        .filter(InformedEntityToAlerts.entity_type == EntityTypes.routes)
        .group_by(InformedEntityToAlerts.entity_id)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["route_id", "alert_count"])


#  create a result as pandas dataframe, where you group the count of alerts by stop
def get_alerts_by_stop():
    result = (
        db.session.query(
            InformedEntityToAlerts.entity_id,
            func.count(InformedEntityToAlerts.alert_id).label("alert_count"),
        )
        .filter(InformedEntityToAlerts.entity_type == EntityTypes.stops)
        .group_by(InformedEntityToAlerts.entity_id)
        .all()
    )
    # return list(result)
    return pd.DataFrame(result, columns=["stop_id", "alert_count"])
# 

#  create a result as pandas dataframe, where you group the count of trip updates by trips
def get_trip_updates_by_trips():

    result = (
        db.session.query(
            TripUpdate.trip_id,
            func.count(TripUpdate.trip_update_id).label("update_count"),
        )
        .group_by(TripUpdate.trip_id)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["trip_id", "update_count"])


#  create a result as pandas dataframe, where you group the count of trip updates by routes
def get_trip_updates_by_stops():
    result = (
        db.session.query(
            TripUpdateToStop.stop_id,
            func.count(TripUpdateToStop.alert_id).label("update_count"),
        )
        .group_by(TripUpdateToStop.stop_id)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["stop_id", "update_count"])


#  create a result as pandas dataframe, where you group the count of trip updates by stops
def get_trip_updates_by_routes():
    result = (
        db.session.query(
            TripUpdate.route_id,
            func.count(TripUpdate.trip_update_id).label("update_count"),
        )
        .group_by(TripUpdate.route_id)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["route_id", "update_count"])


def get_alerts_by_causes():
    result = (
        db.session.query(
            Alert.cause,
            func.count(Alert.alert_id).label("count_alerts"),
        )
        .group_by(Alert.cause)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["cause", "count_alerts"])


def get_alerts_by_effects():
    result = (
        db.session.query(
            Alert.effect,
            func.count(Alert.alert_id).label("count_alerts"),
        )
        .group_by(Alert.effect)
        .all()
    )

    # return list(result)
    return pd.DataFrame(result, columns=["effect", "count_alerts"])


def addAlertInfoToSheet(excel_sheet, sheet_name):

    alerts_by_effects = get_alerts_by_effects() 
    alerts_by_causes = get_alerts_by_causes() 
    alerts_by_routes = get_alerts_by_route() 
    alerts_by_trips = get_alerts_by_trips() 
    alerts_by_stops = get_alerts_by_stop() 
    list_tables = [ alerts_by_causes, alerts_by_effects, alerts_by_routes, alerts_by_stops, alerts_by_trips]

    current_row = 0
    for df in list_tables:
        numRows = len(excel_sheet)+1
        df.to_excel(excel_sheet,sheet_name,header=True, startrow=current_row)
        current_row += numRows

def addTripUpdateInfoToSheet(excel_sheet, sheet_name):

    trip_updates_routes = get_trip_updates_by_routes() 
    trip_updates_trips = get_trip_updates_by_trips() 
    trip_updates_stops = get_trip_updates_by_stops() 
    list_tables = [ trip_updates_routes, trip_updates_trips, trip_updates_stops]

    current_row = 0
    for df in list_tables:
        numRows = len(excel_sheet)+2
        df.to_excel(excel_sheet,sheet_name,header=True, startrow=current_row)
        current_row += numRows



def create_service_excel():
    current_time = datetime.datetime.now()

    
    filename = Path(current_app.config["EXCEL_SUMMARIES"]  , f"{current_time.strftime()}.xlsx")
    workbook = openpyxl.open(filename)
    workbook.create_sheet("Alerts")
    workbook.create_sheet("TripUpdates")

    addAlertInfoToSheet(worksheet, "Alerts")
    addTripUpdateInfoToSheet(worksheet, "TripUpdates")
    workbook.save()
