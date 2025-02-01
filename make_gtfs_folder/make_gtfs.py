import pandas as pd
import openpyxl
import zipfile
# from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
# from typing import Optional, Any, AnyStr
# from google.auth.transport.requests import Request
# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from googleapiclient.discovery import build
# from googleapiclient.errors import HttpError
import argparse
import subprocess
import importlib
import webbrowser
import os
import tkinter
import io
import sys
import tkinter as tk
from tkinter import ttk
from tkinter.messagebox import showinfo
from tkinter.filedialog import askopenfilename,asksaveasfilename 
from threading import Thread
    # parser = argparse.ArgumentParser()

    # parser.add_argument("link")
    # argsholder = parser.parse_args(sys.argv[1:])
    # LINK = argsholder.link

FILE_PATH = os.path.dirname(__file__)
# CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/new_creds.json")
# REFRESH_CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/refresh.json")
# EXCEL_FILES_FOLDER_NAME = "AUTOMATED GTFS_GENERATION"
# SCOPES = [
#     "https://www.googleapis.com/auth/drive",
#     "https://www.googleapis.com/auth/drive.readonly",
# ]
# FOLDER_ID = LINK.split("/")[-1]
GTFS_VALIDATOR_PATH =os.path.normpath(f"{FILE_PATH}/gtfs-validator-6.0.0-cli.jar")

EXCEL_FILENAME= os.path.normpath(f"{FILE_PATH}/gtfs.xlsx")
EXPORT_GTFS_ZIP_LOCATION=os.path.normpath(f"{FILE_PATH}/gtfs_export.zip")
# def get_credentials() -> Optional[Credentials]:

#     creds = None
#     if os.path.exists(CREDENTIALS_PATH):
#         creds = Credentials.from_authorized_user_file(CREDENTIALS_PATH)

#     if creds is None or not creds.valid:
#         flow = InstalledAppFlow.from_client_secrets_file(
#             REFRESH_CREDENTIALS_PATH, SCOPES
#         )
#         creds = flow.run_local_server()
#         # Save the credentials for the next run
#         with open(CREDENTIALS_PATH, "w") as token:
#             token.write(creds.to_json())

#     return creds


# def get_drive_api(creds: Credentials) -> Optional[Any]:
#     return build("drive", "v3", credentials=creds)

# def find_file_in_folder(service, folder_id: str, name: str):
#     query = f"'{folder_id}' in parents AND name = '{name}' "
#     result = service.files().list(q=query).execute()["files"]
#     if not result:
#         raise Exception(f"File not found with name {name}")
#     return result[0]

# def get_excel_files_folder(service):
#     return find_file_in_folder(service,FOLDER_ID, EXCEL_FILES_FOLDER_NAME)

# def download_folder(output_path:str, file_bytes, service) -> None:
#     id = file_bytes["id"]
#     files = service.files().list(q=f" '{id}' in parents ").execute()["files"]
#     if not files:
#         print("No files in folder")
#         return

#     if not os.path.exists(output_path):
#         os.mkdir(output_path)

#     for excel_file in files:
#         while True:
#             try:
#                 print(f"Download {excel_file["name"]}")
#                 file_bytes = io.BytesIO()
#                 request = service.files().export(
#                     fileId=excel_file["id"],
#                     mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
#                 )
#                 downloader = MediaIoBaseDownload(file_bytes, request)
#                 done = False
#                 while done is False:
#                     status, done = downloader.next_chunk()
#                     print(f"Download progress {int(status.progress() * 100)}%")

#                 with open(EXCEL_FILENAME,
#                     "wb",
#                 ) as new_excel_file:
#                     new_excel_file.write(file_bytes.getvalue())
#                 break
#             except HttpError as httpe:
#                 print(httpe.error_details)



def validate_gtfs(logs,zipfile_path, result_path):
    with subprocess.Popen(
        [
            "java",
            "-jar",
            GTFS_VALIDATOR_PATH,
            "--input",
            zipfile_path,
            "-o",
            result_path,
        ], stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True
    ) as process:
        print("Waiting for jar file validation")
        stdout, sterr = process.communicate()
        if process.returncode != 0:
            print(stderr)
            logs.insert(tk.END, f"Jar file validation error output:\n{stderr}")
        else:
            print(stdout)
            logs.insert(tk.END, f"Jar file validation output:\n{stdout}")
            webbrowser.open(
                f"file://{result_path}/report.html", autoraise=True
            )

def getRoutesDataFrame(excel_file):
    return pd.read_excel(excel_file, "Routes")

def getStopsDataFrame(excel_file):
    return pd.read_excel(excel_file, "Stops")

def getServicesDataFrame(excel_file):
    return pd.read_excel(excel_file, "Services")

def getShapesDataFrame(excel_file):
    return pd.read_excel(excel_file, "Shapes")

def getAgencyDataFrame(excel_file):
    return pd.read_excel(excel_file, "AgencyInfo")

def getFeedInfoDataFrame(excel_file):
    return pd.read_excel(excel_file, "FeedInfo")

def getCalendarDaysDataFrame(excel_file):
    return pd.read_excel(excel_file, "CalendarDays")

def getStops(stops_df):
    return set(stops_df["stop_id"])

def getShapes(shapes_df):
    return set(shapes_df["shape_id"])

def getRoutes(routes_df):
    return set(routes_df["route_id"])

def getServices(services_df):
    return set(services_df["service_id"])

def get_metadata(excel_file, sheet_name, services, shapes):
    df =  pd.read_excel(excel_file, sheet_name=sheet_name, nrows=2)

    if df["Service"][0] not in services:
        raise ValueError(f"No such service ( {df["Service"][0] or ""} ) in sheet {sheet_name}  ")
    
    if pd.notna(df["Shape"][0]) and df["Shape"][0] not in shapes:
        raise ValueError(f"No such shape ( {df["Shape"][0]} ) in sheet {sheet_name}  ")
    
    if not df["TripHeadsign"][0]   :
        raise ValueError(f"No trip Headsign given in {sheet_name} ")

    return  df["Service"][0], df["Shape"][0]
    

def read_schedule_as_df(excel_file, sheet_name):
    return pd.read_excel(excel_file, sheet_name=sheet_name, skiprows=2)  

def add_schedule(excel_file, sheet_name, stoptime_df:pd.DataFrame, trip_df, route_id, services, shapes, stops):
    try: 
        service_id, shape_id = get_metadata(excel_file, sheet_name, services, shapes)
        df_schedule= read_schedule_as_df(excel_file,sheet_name)
        df_schedule = df_schedule.set_index("TRAIN NO.").dropna(axis=1, how="all")
        
        for train_number in df_schedule:
            
            trip_id = f"{service_id}-{train_number}"
            if trip_id in trip_df["trip_id"]:
                raise ValueError(f"Duplicate trip {trip_id} in sheet {sheet_name}.")
            trip_df = trip_df._append( { "route_id":route_id, "service_id":service_id, "trip_id":trip_id, "trip_headsign":f"{train_number}-{sheet_name}", "shape_id":shape_id }, ignore_index=True)
            for i,stop in enumerate(df_schedule.index):
                if stop not in stops:
                    raise ValueError(f"Stop {stop} in sheet {sheet_name} doesnt exist.")
                time = df_schedule[train_number].iloc[i]
                stoptime_df = stoptime_df._append( {"trip_id":trip_id,"arrival_time":time ,"departure_time":time, "stop_id":stop, "stop_sequence":i, "timepoint":1}, ignore_index=True)
        
        return stoptime_df, trip_df
    except ValueError as e:
        raise e


def generate_gtfs_zip(logs, output_path, excel_file):
    trip_df = pd.DataFrame(columns=["route_id", "service_id", "trip_id", "trip_headsign", "shape_id"])
    stop_time_df= pd.DataFrame(columns=["trip_id", "arrival_time", "departure_time", "stop_id","stop_sequence", "timepoint"])
    routes_df = getRoutesDataFrame(excel_file)
    services_df = getServicesDataFrame(excel_file)
    shapes_df = getShapesDataFrame(excel_file)
    agency_df =getAgencyDataFrame(excel_file)
    calendar_days_df = getCalendarDaysDataFrame(excel_file)
    feed_info_df = getFeedInfoDataFrame(excel_file)
    stops_df = getStopsDataFrame(excel_file)
    stops = getStops(stops_df)
    routes = getRoutes(routes_df)
    services = getServices(services_df)
    shapes = getShapes(shapes_df)
    ## in binary mode right?
    workbook = openpyxl.load_workbook(excel_file)

    directory = workbook["Directory"]
    errors = False
    for route in directory.iter_cols():
        route_name = route[0].value
        
        # get route id 
        route_id = routes_df[routes_df["route_long_name"] == route_name].iloc[0]["route_id"] 
        for sheet_cell in route[1:]:
            try:
                if not sheet_cell.hyperlink:
                    continue
                sheet_name = get_sheet_name_from_hyperlink(sheet_cell.hyperlink.location) 
                stop_time_df, trip_df = add_schedule(excel_file, sheet_name,stop_time_df, trip_df, route_id, services, shapes, stops)
                logs.insert(tk.END,f"Finished sheet: {sheet_name}\n")
            except Exception as e:
                errors = True
                logs.insert(tk.END,f"Issue in sheet \"{sheet_name}\":{e}\n")
                print(sheet_name, e)
    if errors:
        logs.insert(tk.END,f"Cannot create zipfile due to issues.")

    with zipfile.ZipFile(output_path, "w") as gtfs_zip:
        write_df_to_zipfile(gtfs_zip, "stop_times.txt", stop_time_df)
        write_df_to_zipfile(gtfs_zip, "stops.txt", stops_df )
        write_df_to_zipfile(gtfs_zip, "trips.txt", trip_df)
        write_df_to_zipfile(gtfs_zip, "feed_info.txt", feed_info_df)
        write_df_to_zipfile(gtfs_zip, "agency.txt", agency_df)
        write_df_to_zipfile(gtfs_zip, "routes.txt", routes_df)
        write_df_to_zipfile(gtfs_zip, "calendar_dates.txt", calendar_days_df)
        write_df_to_zipfile(gtfs_zip, "shapes.txt", shapes_df)
        write_df_to_zipfile(gtfs_zip, "calendar.txt", services_df)

    validate_gtfs(logs,output_path, os.path.normpath(os.path.normpath(f"{FILE_PATH}/result")))



def main(logs):
    global EXCEL_FILENAME
    EXCEL_FILENAME = askopenfilename(filetypes=[("Excel files", "*.xlsx")])
    if not EXCEL_FILENAME:
        return
    global EXPORT_GTFS_ZIP_LOCATION 
    filetypes_saveas= [("Zip file", "*.zip")]
    EXPORT_GTFS_ZIP_LOCATION  = asksaveasfilename(filetypes=filetypes_saveas)
    generate_gtfs_zip(logs, EXPORT_GTFS_ZIP_LOCATION, EXCEL_FILENAME)

    
def get_sheet_name_from_hyperlink(link):
    if link.startswith("#"):
        link =  link.split("#")[1].split("!")[0]
    link = link.split("!")[0]
    if link.startswith("'"):
        link = link[1:len(link)-1]
    return link


def write_df_to_zipfile(zip_file, filename, df):
    data_stream = io.StringIO()
    with data_stream:
        df.to_csv(data_stream, index=False)
        zip_file.writestr(
            zipfile.ZipInfo(filename), data_stream.getvalue()
        )

def create_window():
    root = tk.Tk()
    root.title("Generate gtfs.")

    logs = tk.Text(root )
    logs.pack(expand=True) 
    button  = ttk.Button(root, text="Choose gtfs excel filename", )
    def main_thread():
        def action():
            logs.delete("1.0", "end")
            button.state(["disabled"])
            main(logs)
            button.state(["!disabled"])
        thread = Thread(target=action)
        thread.start()
    button.configure(command=main_thread)
    button.pack(expand=True)
    root.pack_propagate(True)
    root.mainloop()



if __name__ == "__main__":
    create_window()
