from gtfs_rt_server import  init_app 
from gtfs_rt_server.db_utils import insert_user, add_role
app = init_app(db_init=True)

with app.app_context():
    add_role("admin")
    add_role("excel")
    add_role("view")
    add_role("edit")
    add_role("gtfs")
    insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"], ["admin", "view", "edit", "gtfs", "excel"])
    insert_user(app.config["PRASA_ADMIN_USERNAME"], app.config["PRASA_ADMIN_PASS"], [ "view", "edit", "gtfs", "excel"])