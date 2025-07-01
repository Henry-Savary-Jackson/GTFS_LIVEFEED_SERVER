

from gtfs_rt_server import  init_app, socketio
from gtfs_rt_server.db_utils import insert_user, add_role, get_user_by_username
from dotenv import load_dotenv
load_dotenv()
app = init_app()

with app.app_context():
    add_role("admin")
    add_role("excel")
    add_role("view")
    add_role("edit")
    add_role("gtfs")
    # if not get_user_by_username("admin"):
    insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"], ["admin", "excel", "view", "edit", "gtfs", "excel"])
    insert_user("fred", "fred", ["view", "edit"])
    insert_user("amy", "amy", ["view", "gtfs"])


if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5000,ssl_context=("fullchain.pem", "privkey.pem"))
