
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from google.protobuf.json_format import ParseDict, MessageToDict
from gtfs_rt_server import redis, socketio
from gtfs_rt_server.protobuf_utils import get_empty_feed_message
from threading import Thread

import json

FILE_LOCK_KEY = "file_lock"

def listen_to_redis_pubsub(pubsub_channel, socketio_room):
    pubsub = redis.pubsub()
    pubsub_channel = get_pubsub_channel_key(pubsub_channel) 
    pubsub.subscribe(pubsub_channel)
    for pubsub_msg in pubsub.listen():
        data_str= pubsub_msg["data"]
        if data_str == b"kill":
            pubsub.unsubscribe(pubsub_channel)
            break
        if not (isinstance(data_str, str) or isinstance(data_str, bytes) or isinstance(data_str,bytearray)):
            continue
        event, message = read_pubsub_to_dict(data_str)
        socketio.emit(event, message, room=socketio_room)



class PubSubListener(Thread):

    def __init__(self, socketio,pubsub_channel, socketio_room ):
        Thread.__init__(self)
        self._socketio = socketio
        self._pubsub_channel = get_pubsub_channel_key(pubsub_channel) 
        self._socketio_room = socketio_room 
        self._pubsub = redis.pubsub()

    def run(self):
        self._pubsub.subscribe(self._pubsub_channel)
        for pubsub_msg in self._pubsub.listen():
            data_str= pubsub_msg["data"]
            if data_str == b"kill":
                self._pubsub.unsubscribe(self._pubsub_channel)
                break
            if not (isinstance(data_str, str) or isinstance(data_str, bytes) or isinstance(data_str,bytearray)):
                continue
            event, message = read_pubsub_to_dict(data_str)
            socketio.emit(event, message, room=self._socketio_room)

def get_pubsub_channel_key(channel):
    return f"ps:{channel}"

def publish_event(channel,event_name, message ):
    redis.publish(get_pubsub_channel_key(channel), json.dumps({"event":event_name, "message":message}))

def read_pubsub_to_dict(data_str):
    data = json.loads(data_str)
    return data["event"], data["message"]

def publish_kill(channel):
    redis.publish(get_pubsub_channel_key(channel), "kill")

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

