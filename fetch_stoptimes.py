import bs4
import asyncio
import aiohttp
import datetime
import aio
import pandas
from dataclasses import dataclass

OUTPUT_DIR = "output_dir"
DOMAIN = "https://cttrains.co.za"

URLS = {
    "STH-L": "ss_route_select.php",
    "NTH-COMB-L": "ns_bell_route_select.php",
    "NTH-BELL-L": "ns_mv_bell_route_select.php",
}


@dataclass
class Stop:
    stop_id: str = ""
    stop_name: str = ""
    stop_desc: str = ""
    stop_lat: int = 0
    stop_lon: int = 0
    zone_id: str = ""
    stop_url: str = ""


@dataclass
class Stop_time:
    stop_id: str = ""
    trip_id: str = ""
    arrival_time: datetime.time = datetime.datetime.now().time()
    departure_time: datetime.time = datetime.datetime.now().time()
    stop_sequence: int = 0
    stop_headsign: str = ""
    pickup_type: str = ""


@dataclass
class Trip:
    trip_id: str = ""
    service_id: str = ""
    trip_headsign: str = ""
    direction_id: int = 0
    shape_id: str = ""
    block_id: str = ""


@dataclass
class Service:
    service_id: str = ""
    monday: int = 1
    tuesday: int = 1
    wednesday: int = 1
    thursday: int = 1
    friday: int = 1
    saturday: int = 1
    sunday: int = 1


@dataclass
class Route:
    route_id: str = ""
    route_short_name: str = ""
    route_long_name: str = ""
    agency_id: str = ""
    route_description: str = ""
    route_type: int = 2
    route_text_color: str = ""


@dataclass
class Shape:
    shape_id: str = ""


AGENCY_ID = "Prasa001"


def get_services():
    return [
        Service(service_id="WD", saturday=0, sunday=0),
        Service(service_id="WE", monday=0, tuesday=0, wednesday=0,thursday=0, friday=0, sunday=0),
    ]


def get_routes():

    return [
        Route(
            route_id="STH-L",
            route_short_name="SL",
            route_long_name="Southern Line",
            agency_id=AGENCY_ID,
            route_description="The southern line",
        )
    ]


def get_shapes():
    return [Shape(shape_id="stl-shape")] 


async def get_stop_times(route,stops, trips):

    pass


async def get_trips(route:Route, stops):
    url = f"{DOMAIN}/{URLS[route.route_id]}"


async def get_stops(route:Route):
    url = f"{DOMAIN}/{URLS[route.route_id]}"
    async with aiohttp.ClientSession(url) as session:
        async with session.get() as response:
            soup = bs4.BeautifulSoup(await response.text())
            station_list = soup.find(id="arriveStation") 
            if station_list is None:
                raise Exception("wtf no stations")

            stations  = station_list.find_all("option")
            output_stops = []
            for station in stations:
                name =station.get_text()
                output_stops.append(Stop(stop_id=name[:5], stop_name=name))

            return output_stops
            


def create_dataframe(stops, routes, shapes, stop_times, services, trips):
    pass
