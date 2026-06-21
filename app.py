# import gevent 
# gevent.monkey.patch_all()

from gtfs_rt_server import  init_app, socketio
from gtfs_rt_server.db_utils import insert_user, add_role, get_user_by_username, set_feed_password
from dotenv import load_dotenv
load_dotenv()
app, celery_app = init_app()

with app.app_context():
    add_role("admin")
    add_role("excel")
    add_role("view")
    add_role("edit")
    add_role("gtfs")
    insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"], ["admin", "view", "edit", "gtfs", "excel"])
    insert_user(app.config["PRASA_ADMIN_USERNAME"], app.config["PRASA_ADMIN_PASS"], [ "view", "edit", "gtfs", "excel"])
    set_feed_password(app.config["FEED_USERNAME"], app.config["FEED_PASSWORD"])


if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5000,ssl_context=("fullchain.pem", "privkey.pem"))
