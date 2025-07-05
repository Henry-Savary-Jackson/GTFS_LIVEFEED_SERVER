
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from google.protobuf.json_format import ParseDict, MessageToDict
from gtfs_rt_server import redis, socketio
from gtfs_rt_server.protobuf_utils import get_empty_feed_message
from threading import Thread
import json
from celery import shared_task

def listen_to_redis_pubsub(socketio, pubsub_channel, socketio_room):
    while True:
        key, data = redis.blpop(pubsub_channel)
        if data == b"kill":
            redis.delete(pubsub_channel)
            break
        event, message = read_pubsub_to_dict(data)
        socketio.emit(event, message, room=socketio_room)

def publish_event(channel,event_name, message ):
    redis.rpush(channel,json.dumps({"event":event_name, "message":message})) 

def read_pubsub_to_dict(data_str):
    data = json.loads(data_str)
    return data["event"], data["message"]

def publish_kill(channel):
    redis.rpush(channel,"kill")

def get_feed_lock(type):
    return redis.lock(f"lock:{type}")