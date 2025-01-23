import openpyxl
import pandas as pd


SCHEDULE_FILE = "SCHEDULES.xlsx"
STOP_TIMES_EXCEL = "stop_times_excel.xlsx"

stop_times_df = pd.DataFrame(columns=["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign", "pickup_type"])

def get_stop_time_row(trip_id, stop_id,arrival_time,stop_sequence):
    return {"trip_id":trip_id, "arrival_time":arrival_time, "departure_time":arrival_time, "stop_id":stop_id, "stop_sequence":stop_sequence, "stop_headsign":"", "pickup_type":""}

workbook = openpyxl.load_workbook(SCHEDULE_FILE)
for sheet_name in workbook.get_sheet_names():
    sheet_df = pd.read_excel(sheet_name)

    for column in sheet_df.columns:

        rows_data = [get_stop_time_row(column, sheet_df.index.iloc[i],sheet_df[column].iloc[i],i ) for i in range(len(sheet_df.index))]
        
        rows = pd.DataFrame(data=rows_data ,columns =stop_times_df.columns)

        stop_times_df = pd.concat(stop_times_df,rows )

stop_times_df.to_excel(STOP_TIMES_EXCEL)


