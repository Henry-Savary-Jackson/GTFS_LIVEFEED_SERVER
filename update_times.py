import sqlite3
import datetime as dt

conn = sqlite3.connect("./server_files/shared_private/gtfs.sqlite3")

with conn:
    conn.execute("ALTER TABLE alerts ADD COLUMN description TEXT").fetchall()
    alerts = conn.execute("SELECT alert_id, start_time, end_time FROM alerts").fetchall()
    for alert in alerts:
        alert_id = alert[0]
        new_start=  dt.datetime.fromtimestamp(alert[1]).isoformat() if alert[1]  is  not None else None
        new_end=  dt.datetime.fromtimestamp(alert[2]).isoformat() if alert[2]  is  not None else None
        conn.execute("UPDATE alerts SET start_time=? , end_time=? WHERE alert_id = ?", [new_start, new_end, alert_id]).fetchall()