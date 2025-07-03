
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from google.protobuf.json_format import ParseDict, MessageToDict
from gtfs_rt_server import redis, socketio
from gtfs_rt_server.protobuf_utils import get_empty_feed_message
from threading import Thread
import json

def listen_to_redis_pubsub(pubsub_channel, socketio_room):
    while True:
        key, data = redis.blpop(pubsub_channel)
        if data == "kill":
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

def save_feed_to_redis(feed_message:gtfs_rt.FeedMessage, key):
    redis.set(f"feed:{key}", feed_message.SerializeToString())

def get_feed_from_redis(key):
    feed_str = redis.get(f"feed:{key}")
    feed_object = gtfs_rt.FeedMessage()
    if not feed_str:
        feed_object = get_empty_feed_message() 
        save_feed_to_redis(feed_object, key)
        return feed_object
    else:
        feed_object.ParseFromString(feed_str)
    return  feed_object

