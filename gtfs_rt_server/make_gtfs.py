import pandas as pd
import openpyxl
import zipfile
from celery.states import *
import sqlalchemy
import subprocess
import os
import io
import sys
import json


FILE_PATH = os.path.dirname(__file__)


def has_errors(result_path):
    report_json = json.load(open(os.path.normpath(f"{result_path}/report.json"), "r"))
    notices = report_json["notices"]
    for notice in notices:
        if notice["severity"] == "WARNING":
            return True
    return False


def validate_gtfs(validator_path, zipfile_path, result_path, update_method=None):
    with subprocess.Popen(
        [
            "java",
            "-jar",
            validator_path,
            "--input",
            zipfile_path,
            "-o",
            result_path,
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    ) as process:
        print("Waiting for jar file validation")
        if update_method:
            update_method(status="working", message="Waiting for jar file validation")
        stdout, stderr = process.communicate()
        if process.returncode != 0:
            raise Exception(f"error:\n{stderr}")
        else:
            print(stdout)
            if update_method:
                update_method(status="working", message=stdout or "")

def read_sheet_as_df(excel_file, sheet_name, **kwargs):
    try:
        print("hey", kwargs )
        return pd.read_excel(excel_file, sheet_name, **kwargs)
    except ValueError as e:
        if "Excel file format cannot be determined" in str(e):
            raise Exception("Invalid Excel file") 
        raise e


def getRoutesDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "Routes")


def getStopsDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "Stops")


def getServicesDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "Services")


def getShapesDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "Shapes")


def getAgencyDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "AgencyInfo")


def getFeedInfoDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "FeedInfo")


def getCalendarDaysDataFrame(excel_file):
    return read_sheet_as_df(excel_file, "CalendarDays")


def getStops(stops_df):
    return set(stops_df["stop_id"])


def getShapes(shapes_df):
    return set(shapes_df["shape_id"])


def getRoutes(routes_df):
    return set(routes_df["route_id"])


def getServices(services_df):
    return set(services_df["service_id"])


def get_metadata(excel_file, sheet_name, services, shapes):
    df = read_sheet_as_df(excel_file, sheet_name, nrows=2)

    if df["Service"][0] not in services:
        raise ValueError(
            f"No such service ( {df["Service"][0] or ""} ) in sheet {sheet_name}  "
        )

    if pd.notna(df["Shape"][0]) and df["Shape"][0] not in shapes:
        raise ValueError(f"No such shape ( {df["Shape"][0]} ) in sheet {sheet_name}  ")

    if not df["TripHeadsign"][0]:
        raise ValueError(f"No trip Headsign given in {sheet_name} ")

    return df["Service"][0], df["Shape"][0]


def read_schedule_as_df(excel_file, sheet_name):
    return read_sheet_as_df(excel_file, sheet_name, skiprows=2)


def add_schedule(
    excel_file,
    sheet_name,
    stoptime_df: pd.DataFrame,
    stop_df,
    trip_df,
    route_id,
    services,
    shapes,
    stops,
):
    try:
        service_id, shape_id = get_metadata(excel_file, sheet_name, services, shapes)
        df_schedule = read_schedule_as_df(excel_file, sheet_name)
        df_schedule = df_schedule.set_index("TRAIN NO.").dropna(axis=1, how="all")
        for train_number in df_schedule:

            stop_times_trip_df = pd.DataFrame(columns=stoptime_df.columns)
            trip_id = f"{service_id}-{train_number}"
            if trip_id in trip_df["trip_id"]:
                raise ValueError(f"Duplicate trip {trip_id} in sheet {sheet_name}.")

            stop = ""
            for i, stop in enumerate(df_schedule.index):
                if stop not in stops:
                    raise ValueError(f"Stop {stop} in sheet {sheet_name} doesnt exist.")
                time = df_schedule[train_number].iloc[i]
                stop_times_trip_df = stop_times_trip_df._append(
                    {
                        "trip_id": trip_id,
                        "arrival_time": time,
                        "departure_time": time,
                        "stop_id": stop,
                        "stop_sequence": i,
                        "timepoint": 1,
                    },
                    ignore_index=True,
                )
            stoptime_df = pd.concat([stoptime_df, stop_times_trip_df])
            trip_df = trip_df._append(
                {
                    "route_id": route_id,
                    "service_id": service_id,
                    "trip_id": trip_id,
                    "trip_headsign": get_stop_name(stop_df, stop),
                    "shape_id": shape_id,
                },
                ignore_index=True,
            )
        return stoptime_df, trip_df
    except ValueError as e:
        raise e


def generate_gtfs_zip(excel_file, export_location, validator_path,result_path, update_method=None):
    trip_df = pd.DataFrame(
        columns=["route_id", "service_id", "trip_id", "trip_headsign", "shape_id"]
    )
    stop_time_df = pd.DataFrame(
        columns=[
            "trip_id",
            "arrival_time",
            "departure_time",
            "stop_id",
            "stop_sequence",
            "timepoint",
        ]
    )
    if update_method:
        update_method(status="working", message="Reading Spreadsheets")
    print("getting dfs")
    routes_df = getRoutesDataFrame(excel_file)
    services_df = getServicesDataFrame(excel_file)
    shapes_df = getShapesDataFrame(excel_file)
    agency_df = getAgencyDataFrame(excel_file)
    calendar_days_df = getCalendarDaysDataFrame(excel_file)
    feed_info_df = getFeedInfoDataFrame(excel_file)
    stops_df = getStopsDataFrame(excel_file)
    stops = getStops(stops_df)
    routes = getRoutes(routes_df)
    services = getServices(services_df)
    shapes = getShapes(shapes_df)
    ## in binary mode right?
    workbook = openpyxl.load_workbook(excel_file)
    print("getting directory")

    directory = workbook["Directory"]
    for route in directory.iter_cols():
        route_name = route[0].value
        # get route id
        route_id = routes_df[routes_df["route_long_name"] == route_name].iloc[0][
            "route_id"
        ]
        for sheet_cell in route[1:]:
            try:
                if not sheet_cell.hyperlink:
                    continue
                sheet_name = get_sheet_name_from_hyperlink(
                    sheet_cell.hyperlink.location
                )
                stop_time_df, trip_df = add_schedule(
                    excel_file,
                    sheet_name,
                    stop_time_df,
                    stops_df,
                    trip_df,
                    route_id,
                    services,
                    shapes,
                    stops,
                )
                print(sheet_name)
                if update_method:
                    update_method( message=f"Added {sheet_name}")
            except Exception as e:
                print(sheet_name, e)
                if update_method:
                    update_method(status="error", message=f"{sheet_name}:{e}")
                raise e

    df_dict = {
        "stop_times.txt": stop_time_df,
        "stops.txt": stops_df,
        "trips.txt": trip_df,
        "feed_info.txt": feed_info_df,
        "agency.txt": agency_df,
        "routes.txt": routes_df,
        "calendar_dates.txt": calendar_days_df,
        "shapes.txt": shapes_df,
        "calendar.txt": services_df,
    }

    if update_method:
        update_method( message=f"Writing the zip file")

    try:
        with zipfile.ZipFile(export_location, "w") as gtfs_zip:
            for filename in df_dict:
                write_df_to_zipfile(gtfs_zip, filename, df_dict[filename])

    except Exception as e:
        if update_method:
            update_method(status="error", message=f"Error creating zip file: {e}")
        print(e)
        raise e

    try:
        print(validator_path)
        print(export_location)
        validate_gtfs(
            validator_path,
            export_location,
            result_path,update_method=update_method
        )
    except Exception as e:
        if update_method:
            update_method(status="error", message=f"Error validating zip file: {e}")
        print(e)
        raise e

    return df_dict


def add_gtfs_tables_to_db(engine: sqlalchemy.Engine, df_dict):
    for tablename in df_dict:
        df: pd.DataFrame = (
            df_dict[tablename]
            .dropna(axis=1, how="all")
            .astype("str")
            .replace("nan", pd.NA)
        )
        if df.empty:
            continue
        df.to_sql(
            tablename[: tablename.find(".")], engine, if_exists="replace", index=False
        )


def get_stop_name(stops_df, stop_id):
    return stops_df[stops_df["stop_id"] == stop_id].iloc[0]["stop_name"]


def get_sheet_name_from_hyperlink(link):
    if link.startswith("#"):
        link = link.split("#")[1].split("!")[0]
    link = link.split("!")[0]
    if link.startswith("'"):
        link = link[1 : len(link) - 1]
    return link


def write_df_to_zipfile(zip_file, filename, df):
    data_stream = io.StringIO()
    with data_stream:
        df.to_csv(data_stream, index=False)
        zip_file.writestr(zipfile.ZipInfo(filename), data_stream.getvalue())


# if __name__ == "__main__":
#     generate_gtfs_zip(open("schedules(3).xlsx", "rb"), "./")
