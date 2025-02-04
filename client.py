import requests
from google.transit import gtfs_realtime_pb2 as gtfs_rt
from google.protobuf.json_format import ParseDict
import os
import dotenv
import datetime
from uuid import uuid4

dotenv.load_dotenv()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASS")

cookie_dict = {
    "session": ".eJwljkuKAzEMBe_i9SxsWW5ZuUyjLxOGSaA7WYXcPYbAgwdFLepV9jzi_C2Xx_GMn7JfvVwKkVWDQcyNMsYMGTkEo9XOXcU3DNQY2RMyDIN6unBzd2jMCIjimWDaogY38amtp1EAuUGspcyNgNePpdeqA4bqhojkdSsr5HnG8a0R_7_eFrLzyP1x_4vbgiaCRh2GNBGGGVytCffppr3lJBk11bS8P-riQyI.Z6I47A.4aVbgr2f3ikY-UzZ-xzRmBlDwzU",
    "remember_token": "admin|5de382e70aa94d88d0d566bcd041c5d092e2b1b55d169d7e31db129dd5a94f21e2b02540d794d992ca56d04fa28177516c873e5174db4ee9c9d820340596c0f6",
}


def get_feed():
    with requests.get("http://localhost:5000/feed") as response:
        feed = gtfs_rt.FeedMessage()
        feed.ParseFromString(response.content)
        print(feed)


def login_and_post():

    with requests.Session() as session:
        service_alert = gtfs_rt.FeedEntity()
        service_alert_data = {
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
                "informed_entity": [
                    {
                        # valid parameters:
                        # agency_id, route_id, route_type, stop_id, trip (see TripDescriptor)
                        "route_id": "MALM"
                    }
                ],
                "cause": "CONSTRUCTION",
                "effect": "DETOUR",
            },
        }
        service_alert.CopyFrom(ParseDict(service_alert_data, gtfs_rt.FeedEntity()))

        print(service_alert)
        with session.post(
            "http://localhost:5000/service_alert",
            data=service_alert.SerializeToString(),
            cookies=cookie_dict,
        ) as response:
            print(response.request.headers)
            print(response.text)


if __name__ == "__main__":
    login_and_post()
    get_feed()
