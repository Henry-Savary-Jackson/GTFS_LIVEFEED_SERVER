from gtfs_rt_server.tests.conftest import client, app, AuthActions,  do_action_logged_in
from copy import deepcopy
from gtfs_rt_server import db
import os
import random
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from google.protobuf.json_format import ParseDict, MessageToDict
import datetime
from gtfs_rt_server.db_utils import get_routes, get_stops, get_trips, get_stoptimes_of_trip, get_number_of_stoptimes
from uuid import uuid4
import tempfile
from sqlalchemy import text

def create_valid_service_alert(entities : list):
    return {
                "id": str(uuid4()),
                "alert": {
                    "active_period": [
                        {
                            # start time in POSIX epoch format
                            "start": int(datetime.datetime.now().timestamp()),
                            # end time in POSIX epoch format
                            "end": int(
                                (
                                    datetime.datetime.now() + datetime.timedelta(days=3)
                                ).timestamp()
                            ),
                        }
                    ],
                    # selects which GTFS entities will be affected
                    "informed_entity": entities,
                    "cause": "CONSTRUCTION",
                    "effect": "DETOUR",
                },
            }

def create_valid_trip_udpate(trip_descriptor, stop_time_updates):
    return {
                "id": str(uuid4()),
                "trip_update": {
                    "trip": trip_descriptor,                    # selects which GTFS entities will be affected
                    "stop_time_update": stop_time_updates,
                }
            }

def test_view_feed(app, client):
    response  = client.get("/feed", follow_redirects=True )
    assert response.status_code == 200
    with open(app.config["FEED_LOCATION"],"rb") as feed_file:
        assert feed_file.read() == response.data


def do_action_with_temp_feed(app, action):

    fd_feed, path_feed = tempfile.mkstemp()
    feed_loc_orig = app.config["FEED_LOCATION"] 
    app.config["FEED_LOCATION"] = path_feed
    with open(feed_loc_orig, "rb") as orig_feed:
        with open(fd_feed, "wb") as new_feed:
            new_feed.write(orig_feed.read()) 
    try:
        return action()
    finally:
        app.config["FEED_LOCATION"] =feed_loc_orig 
        os.remove(path_feed)


def send_service_alert(app, client, informed_entities):
    response = None
    print("alert", informed_entities)
    def action_main():
        def action():
            service_alert = gtfs_rt.FeedEntity()
            try :
                service_alert_data =  create_valid_service_alert(informed_entities)       
                service_alert.CopyFrom(ParseDict(service_alert_data, service_alert))

                response = client.post("/feed/service_alert", data = service_alert.SerializeToString())
                print(response.text)
                return response 
            except Exception as e:
                print("client side:", e)

        return do_action_logged_in(app,client,action)
    return do_action_with_temp_feed(app, action_main)

def send_trip_udpate(app, client, trip_descriptor, stop_time_updates):
    def action_main():
        def action():
            try:
                trip_update = gtfs_rt.FeedEntity()

                trip_update_data =  create_valid_trip_udpate(trip_descriptor, stop_time_updates)       
                trip_update.CopyFrom(ParseDict(trip_update_data, trip_update))

                response = client.post("/feed/trip_update", data = trip_update.SerializeToString())
                return response 
            except Exception as e:
                print("client side:", e)
        return do_action_logged_in(app,client,action)
    return do_action_with_temp_feed(app, action_main)


def test_add_service_alert_stop(app, client):

    ents = []
    with app.app_context():
        ents = [{"stop_id":random.choice(get_stops())[0]}]
    response = send_service_alert(app, client,  ents)
    assert response.status_code == 200
    assert "Successful" == response.text


def test_add_service_alert_route(app, client):
    entities = []
    with app.app_context():
        entities = [{"route_id":random.choice(get_routes())[0]}]
    response = send_service_alert(app, client,entities  )
    assert response.status_code == 200
    assert "Successful" == response.text


def test_add_service_alert_route_and_stop_valid(app, client):
    result = ["test"]
    route_id , stop_id = ["", ""]
    with app.app_context():
        route_id = random.choice(get_routes())[0]
        with db.session.begin():
            sql = "SELECT stop_id FROM stop_times INNER JOIN trips ON stop_times.trip_id = trips.trip_id  WHERE  trips.route_id = :routeid "
            result = db.session.execute(text(sql), {"routeid":route_id}).fetchall()
        stop_id = random.choice(result)[0]
    response = send_service_alert(app, client, [{"routeId":route_id, "stopId":stop_id }])
    assert response.status_code == 200
    assert "Successful" == response.text

def test_add_service_alert_trip_valid(app, client):
    entities =[] 
    with app.app_context():
        entities =[{"trip": {"trip_id": random.choice(get_trips())} }] 
    response = send_service_alert(app, client, entities)
    assert response.status_code == 200
    assert "Successful" == response.text

def test_add_service_alert_malformed(app, client):
    def action():
        response = client.post("/feed/service_alert", data = "270u9818Hd".encode())
        assert response.status_code == 400
        assert "Invalid Protobuf Message format" in response.text
    do_action_logged_in(app,client,action)

def test_add_service_alert_route_doesnt_exist(app, client):
    route_id = "".join([str(random.randrange(0,26)) for i in range(12)])
    response =send_service_alert(app, client, [{"route_id":route_id}])
    assert response.status_code == 400
    assert f"Route with route_id  \"{route_id}\" doesn't exist." == response.text

def test_add_service_alert_stop_doesnt_exist(app, client):
    stop_id = "".join([str(random.randrange(0,26)) for i in range(12)])
    response =send_service_alert(app, client, [{"stop_id":stop_id}])
    assert response.status_code == 400
    assert f"Stop with stop_id \"{stop_id}\" doesn't exist." == response.text

def test_add_service_alert_trip_doesnt_exist(app, client):
    trip_id = "".join([str(random.randrange(0,26)) for i in range(12)])
    response =send_service_alert(app, client, [{"trip":{"trip_id":trip_id}}])
    assert response.status_code == 400
    assert f"Trip with trip_id \"{trip_id}\" doesn't exist." == response.text

def test_add_service_alert_agency_doesnt_exist(app, client):
    agency_id = "".join([str(random.randrange(0,26)) for i in range(12)])
    response =send_service_alert(app, client, [{"agency_id":agency_id}])
    assert response.status_code == 400
    assert f"No such agency with agency_id \"{agency_id}\"." == response.text

def test_add_service_alert_route_and_stop_not_together(app, client):
    route_id = ""

    with app.app_context():
        route_id  = random.choice(get_routes())[0]
    assert route_id != ""
    stop_id = "test" 
    response =send_service_alert(app, client, [{"route_id":route_id, "stop_id":stop_id }])
    assert response.status_code == 400
    assert f"No such stop \"{stop_id}\" is on route \"{route_id}\"." == response.text

def test_add_service_alert_malformed(app, client):
    def action():
        response = client.post("/feed/trip_update", data = "270u9818Hd".encode())
        assert response.status_code == 400
        assert "Invalid Protobuf Message format" in response.text
    do_action_logged_in(app,client,action)

def test_add_trip_update_valid(app, client):
    trip_id = ""
    stop_time_updates = []
    with app.app_context():
        trip_id =random.choice(get_trips())
        num_stoptimes = get_number_of_stoptimes(trip_id)
        trip_desc = {"trip_id":trip_id}
        stop_time_updates = [{ "stop_sequence": random.randrange(1,num_stoptimes+1), "arrival":  {"delay":random.randint(-5,5)} }]
    assert trip_id != ""
    response = send_trip_udpate(app, client, {"trip_id":trip_id}, stop_time_updates)
    assert response.status_code == 200
    assert "Successful" == response.text

def test_add_trip_update_valid_cancelled(app, client):
    trip_id = ""
    stop_time_updates = []
    with app.app_context():
        trip_id =random.choice(get_trips())
        num_stoptimes = get_number_of_stoptimes(trip_id)
    assert trip_id != ""
    trip_desc = {"trip_id":trip_id, "schedule_relationship": "CANCELED"}
    response = send_trip_udpate(app, client, trip_desc, stop_time_updates)
    assert response.status_code == 200
    assert "Successful" == response.text

def test_add_trip_update_stop_sequence_exceed(app, client):
    trip_id = "" 
    stop_time_updates = []
    with app.app_context():
        trip_id =random.choice(get_trips())
        num_stoptimes = get_number_of_stoptimes(trip_id)

    assert trip_id != ""
    trip_desc = {"trip_id":trip_id}
    stop_time_updates = [{ "stop_sequence": num_stoptimes+3, "arrival": {"delay":random.randint(-5,5) }}]
    response = send_trip_udpate(app, client, trip_desc, stop_time_updates)
    assert response.status_code ==400 
    assert f"Invalid stop_sequence exceeds the number of stop times in the trip {trip_id}." == response.text

def test_add_trip_update_trip_doesnt_exist(app, client):
    trip_id ="".join([str(random.randrange(0,26)) for i in range(12)])
    trip_desc = {"trip_id":trip_id}
    stop_time_updates = [{ "stop_sequence": 1,"arrival": {"delay":random.randint(-5,5) } }]
    response = send_trip_udpate(app, client, trip_desc, stop_time_updates)
    assert response.status_code == 400
    assert f"Trip with trip_id \"{trip_id}\" doesn't exist." == response.text

def test_add_trip_update_no_stop_sequence(app, client):
    trip_id = ""
    with app.app_context():
        trip_id =random.choice(get_trips())
    assert trip_id != ""
    trip_desc = {"trip_id":trip_id}
    stop_time_updates = [{ "stopId": "test", "arrival": {"delay":random.randint(-5,5) } }]
    response = send_trip_udpate(app, client, trip_desc, stop_time_updates)
    assert response.status_code == 400
    assert "A stop time update needs the stop_sequence." == response.text

def send_delete(app , client, entity_id):
    def outer_action():
        def action():
            return  client.delete("/feed/delete_feed_entity", data=entity_id) 
        return do_action_logged_in(app, client, action)
    return do_action_with_temp_feed(app, outer_action)

def test_delete_trip_exist(app, client):

    feed = app.config["feed"]

    entity_to_delete = random.choice(feed.entity)

    response =  send_delete(app, client, entity_to_delete.id)

    assert response.status_code == 200
    assert "Successful" == response.text
    
    for entity in feed.entity:
        assert entity.id != entity_to_delete.id


def test_delete_trip_notexist(app, client):
    feed = deepcopy( app.config["feed"])

    response = send_delete(app, client, "1891hdbe2k") 
    assert response.status_code == 200
    assert "Successful" == response.text

    assert feed.SerializeToString() == app.config["feed"].SerializeToString()
