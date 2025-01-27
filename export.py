import os.path
from typing import Optional, Any, AnyStr
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import io
import os
import subprocess
import zipfile
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import pandas
import argparse
import webbrowser
import sys
import datetime

parser = argparse.ArgumentParser()

parser.add_argument("link")
parser.add_argument("-nd", "--no-download", action="store_false")
parser.add_argument("-u", "--upload", action="store_true")
parser.add_argument("-v", "--validate", action="store_true")
argsholder = parser.parse_args(sys.argv[1:])


FILE_PATH = os.path.dirname(__file__)
LINK = argsholder.link
GTFS_VALIDATOR_PATH = os.path.normpath(f"{FILE_PATH}/gtfs-validator-5.0.1-cli.jar")
CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/new_creds.json")
REFRESH_CREDENTIALS_PATH = os.path.normpath(f"{FILE_PATH}/refresh.json")
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.readonly",
]
FOLDER_ID = LINK.split("/")[-1]
EXCEL_FILES_FOLDER_NAME = "AUTOMATED GTFS_GENERATION"


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


def find_file_in_folder(folder_id: str, name: str):
    query = f"'{folder_id}' in parents AND name = '{name}' "
    result = service.files().list(q=query).execute()["files"]
    if not result:
        raise Exception(f"File not found with name {name}")
    return result[0]


def get_excel_files_folder(service):
    return find_file_in_folder(FOLDER_ID, EXCEL_FILES_FOLDER_NAME)


def get_zip_files_folder(service):
    return find_file_in_folder(FOLDER_ID, ZIP_FILES_FOLDER_NAME)


def convert_excel_files_to_csv(folder_path: str, output_path: str):
    if not os.path.exists(folder_path):
        raise Exception(f"No folder of excels found with name {folder_path}")
    filenames = os.listdir(folder_path)

    with zipfile.ZipFile(output_path, mode="w") as export_zip:
        for filename in filenames:
            new_filename = filename.removesuffix(".xlsx")
            df = pandas.read_excel(f"{folder_path}/{filename}", 0)
            if not os.path.exists(output_path):
                os.mkdir(output_path)

            data_stream = io.StringIO()
            with data_stream:
                df.to_csv(data_stream, index=False)
                export_zip.writestr(
                    zipfile.ZipInfo(new_filename), data_stream.getvalue()
                )


def upload_to_drive(path_to_zip: str, folder_id: str, service):
    file_metadata = {"name": os.path.basename(path_to_zip), "parents": [folder_id]}
    media = MediaFileUpload(path_to_zip, mimetype="application/zip")
    created_file = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id")
        .execute()
    )
    return created_file["id"]


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




if __name__ == "__main__":
    creds = get_credentials()
    service = get_drive_api(creds=creds)
    excel_files_path = os.path.normpath(f"{FILE_PATH}/{EXCEL_FILES_FOLDER_NAME}")
    if argsholder.no_download:
        print("Downloading spreadsheets...")
        download_folder(excel_files_path,get_excel_files_folder(service=service), service)
        print("Downloaded spreadsheets")
    print("Converting to a zip file...")
    zip_file_path = os.path.normpath(f"{FILE_PATH}/export_{datetime.datetime.now().isoformat()}.zip")

    convert_excel_files_to_csv(excel_files_path, zip_file_path)
    print(f"Converted to zip file {zip_file_path}")
    if argsholder.validate:
        print("Validating the zipfile")
        result_path = os.path.normpath(f"{FILE_PATH}/result")
        validate_gtfs(zip_file_path, result_path)
        print("Finished validation")
    if argsholder.upload:
        upload_folder = get_zip_files_folder(service)
        print("Uploading to drive...")
        id = upload_to_drive(zip_file_path, upload_folder["id"], service)
        print(f"Uploaded to drive with id {id}.")
