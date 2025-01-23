import pandas as pd
import openpyxl
import zipfile
import argparse
import subprocess
import webbrowser
import os
import tkinter
import io
import sys

parser = argparse.ArgumentParser()

parser.add_argument("link")
argsholder = parser.parse_args(sys.argv[1:])
LINK = argsholder.link

CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/new_creds.json")
REFRESH_CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/refresh.json")
EXCEL_FILES_FOLDER_NAME = "AUTOMATED GTFS_GENERATION"
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.readonly",
]
FOLDER_ID = LINK.split("/")[-1]

EXCEL_FILENAME= os.path.normpath(f"{os.path.dirname(__file__)}/gtfs.xlsx")
EXPORT_GTFS_ZIP_LOCATION=os.path.normpath(f"{os.path.dirname(__file__)}/gtfs_export.zip")
IGNORE_SHEETS= ["Directory", "AgencyInfo", "FeedInfo", "Shapes", "Stops", "Routes", "Services", "CalendarDays"]
def get_credentials() -> Optional[Credentials]:

    creds = None
    if os.path.exists(CREDENTIALS_PATH):
        creds = Credentials.from_authorized_user_file(CREDENTIALS_PATH)

    if creds is None or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            REFRESH_CREDENTIALS_PATH, SCOPES
        )
        creds = flow.run_local_server()
        # Save the credentials for the next run
        with open(CREDENTIALS_PATH, "w") as token:
            token.write(creds.to_json())

    return creds


def get_drive_api(creds: Credentials) -> Optional[Any]:
    return build("drive", "v3", credentials=creds)

def get_excel_files_folder(service):
    return find_file_in_folder(FOLDER_ID, EXCEL_FILES_FOLDER_NAME)

def download_folder(output_path:str, file_bytes, service) -> None:
    id = file_bytes["id"]
    files = service.files().list(q=f" '{id}' in parents ").execute()["files"]
    if not files:
        print("No files in folder")
        return

    if not os.path.exists(output_path):
        os.mkdir(output_path)

    for excel_file in files:
        while True:
            try:
                print(f"Download {excel_file["name"]}")
                file_bytes = io.BytesIO()
                request = service.files().export(
                    fileId=excel_file["id"],
                    mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                downloader = MediaIoBaseDownload(file_bytes, request)
                done = False
                while done is False:
                    status, done = downloader.next_chunk()
                    print(f"Download progress {int(status.progress() * 100)}%")

                name_of_file = excel_file["name"].split()[0]
                index_of_txt = name_of_file.find(".txt")
                if index_of_txt == -1:
                    raise Exception(
                        f"Invalid name of spread sheet {excel_file["name"]}. missing .txt extension after first word."
                    )
                name_of_file = name_of_file[: index_of_txt + 4]
                with open(
                    os.path.normpath(f"{output_path}/{name_of_file}.xlsx"),
                    "wb",
                ) as new_excel_file:
                    new_excel_file.write(file_bytes.getvalue())
                break
            except HttpError as httpe:
                print(httpe.error_details)



def validate_gtfs(zipfile_path, result_path):
    with subprocess.Popen(
        [
            "java",
            "-jar",
            GTFS_VALIDATOR_PATH,
            "--input",
            zipfile_path,
            "-o",
            result_path,
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
    ) as process:
        status_code = process.wait()
        if status_code != 0:
            print(process.communicate()[1])
        else:
            webbrowser.open(
                f"file://{result_path}/report.html", autoraise=True
            )

def getRoutesDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "Routes")

def getStopsDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "Stops")

def getServicesDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "Services")

def getShapesDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "Shapes")

def getAgencyDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "AgencyInfo")

def getFeedInfoDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "FeedInfo")

def getCalendarDaysDataFrame():
    return pd.read_excel(EXCEL_FILENAME, "Shapes")

def getStops(stops_df):
    return set(stops_df["stop_id"])

def getShapes(shapes_df):
    return set(shapes_df["shape_id"])

def getRoutes(routes_df):
    return set(routes_df["route_id"])

def getServices(services_df):
    return set(services_df["service_id"])

def get_metadata(sheet_name, routes, services, shapes):
    df =  pd.read_excel(EXCEL_FILENAME, sheet_name=sheet_name, nrows=2)

    if df["routeId"][0] not in routes:
        raise ValueError(f"No such route ( {df["routeId"][0] or ""} ) in sheet {sheet_name}  ")
    
    if df["Service"][0] not in services:
        raise ValueError(f"No such service ( {df["Service"][0] or ""} ) in sheet {sheet_name}  ")
    
    if pd.notna(df["Shape"][0]) and df["Shape"][0] not in shapes:
        raise ValueError(f"No such shape ( {df["Shape"][0]} ) in sheet {sheet_name}  ")
    
    if not df["TripHeadsign"][0]   :
        raise ValueError(f"No trip Headsign given in {sheet_name} ")

    return df["routeId"][0], df["Service"][0], df["Shape"][0]
    

def read_schedule_as_df(sheet_name):
    return pd.read_excel(EXCEL_FILENAME, sheet_name=sheet_name, skiprows=2), sheet_name 

def add_schedule(sheet_name, stoptime_df:pd.DataFrame, trip_df, routes, services, shapes, stops):
    try: 
        route_id, service_id, shape_id = get_metadata(sheet_name, routes, services, shapes)
        df_schedule, sheet_name = read_schedule_as_df(sheet_name)
        print(sheet_name)
        df_schedule = df_schedule.set_index("TRAIN NO.")
        
        for train_number in df_schedule.columns:
            
            trip_id = f"{service_id}-{train_number}"
            if trip_id in trip_df.index:
                raise ValueError(f"Duplicate trip {trip_id} in sheet {sheet_name}.")
            trip_df.loc[trip_id] = [ route_id, trip_id, f"{train_number}-{sheet_name}", shape_id ]
            for i,stop in enumerate(df_schedule.index):
                if stop not in stops:
                    raise ValueError(f"Stop {stop} in sheet {sheet_name} doesnt exist.")
                time = df_schedule[train_number].iloc[i]
                stoptime_df = stoptime_df._append( {"trip_id":trip_id,"arrival_time":time ,"departure_time":time, "stop_id":stop, "stop_sequence":i}, ignore_index=True)
    except ValueError as e:
        print(f"Experienced exception:\n{e}")


def main():
    creds = get_credentials()
    service = get_drive_api(creds=creds)

    print("Downloading spreadsheets...")
    download_folder("./",get_excel_files_folder(service=service), service)
    print("Downloaded spreadsheets")
    trip_df = pd.DataFrame(columns=["route_id", "service_id", "trip_id", "trip_headsign", "shape_id"]).set_index("trip_id")
    stop_time_df= pd.DataFrame(columns=["trip_id", "arrival_time", "departure_time", "stop_id","stop_sequence"])
    routes_df = getRoutesDataFrame()
    services_df = getServicesDataFrame()
    shapes_df = getShapesDataFrame()
    agency_df =getAgencyDataFrame()
    calendar_days_df = getCalendarDaysDataFrame()
    feed_info_df = getFeedInfoDataFrame()
    stops_df = getStopsDataFrame()
    stops = getStops(stops_df)
    routes = getRoutes(routes_df)
    services = getServices(services_df)
    shapes = getShapes(shapes_df)
    workbook = openpyxl.load_workbook(EXCEL_FILENAME)

    for sheet_name in [ sheet for sheet in workbook.sheetnames if sheet not in IGNORE_SHEETS] :
        try:
            add_schedule(sheet_name,stop_time_df, trip_df, routes, services, shapes, stops)
        except Exception as e:
            print(sheet_name, e)


    with zipfile.ZipFile(EXPORT_GTFS_ZIP_LOCATION, "w") as gtfs_zip:
        write_df_to_zipfile(gtfs_zip, "stop_times.txt", stop_time_df)
        write_df_to_zipfile(gtfs_zip, "stops.txt", stops_df )
        write_df_to_zipfile(gtfs_zip, "trips.txt", trip_df)
        write_df_to_zipfile(gtfs_zip, "feed_info.txt", feed_info_df)
        write_df_to_zipfile(gtfs_zip, "agency.txt", agency_df)
        write_df_to_zipfile(gtfs_zip, "routes.txt", routes_df)
        write_df_to_zipfile(gtfs_zip, "calendar_dates.txt", calendar_days_df)
        write_df_to_zipfile(gtfs_zip, "shapes.txt", shapes_df)
        write_df_to_zipfile(gtfs_zip, "calendar.txt", services_df)

    validate_gtfs(EXPORT_GTFS_ZIP_LOCATION, os.path.normpath(f"{os.path.dirname(__file__)}/result"))

def write_df_to_zipfile(zip_file, filename, df):
    data_stream = io.StringIO()
    with data_stream:
        df.to_csv(data_stream, index=False)
        zip_file.writestr(
            zipfile.ZipInfo(filename), data_stream.getvalue()
        )



if __name__ == "__main__":
    main()
