

from gtfs_rt_server import  init_app
from gtfs_rt_server.db_utils import insert_user, add_role
from dotenv import load_dotenv

load_dotenv()
app = init_app()
celery_app = app.extensions["celery"]

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, ssl_context=("fullchain.pem", "privkey.pem"))
