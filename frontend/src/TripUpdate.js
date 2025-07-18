import { useState, useEffect, useReducer, useContext } from 'react';
import { transit_realtime } from "gtfs-realtime-bindings";
import { useLocation, Link } from 'react-router-dom'
import { TripSearch } from './Search';
import { getServices, convertDateToTimeString, getRoutes, getStopTimesofTrip, sendTripUpdate, convertTimeStrToUNIXEpoch, doActionWithAlert } from './Utils';
import { v4 } from 'uuid'
import { alertsContext } from './Globals';


export function convertDictToGTFSTripUpdate(dict) {
    const feed_entity = transit_realtime.FeedEntity.create()
    const trip_update = transit_realtime.TripUpdate.create()
    feed_entity.tripUpdate = trip_update
    feed_entity.id = dict.id

    trip_update.trip = { "tripId": dict.trip_id }
    trip_update.timestamp = Math.floor(new Date().getTime() / 1000)
    if (dict.cancelled)
        trip_update.trip.scheduleRelationship = transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"];
    for (let i = 0; i < dict.stoptimes.length; i++) {
        const element = dict.stoptimes[i]
        if ('delay' in element || 'skip' in element || 'newTime' in element || 'onTime' in element) {
            const newStopTimeUpdate = transit_realtime.TripUpdate.StopTimeUpdate.create()
            newStopTimeUpdate.stopSequence = i
            if ('skip' in element && element.skip) {
                newStopTimeUpdate.scheduleRelationship = transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship["SKIPPED"]

            } else {
                newStopTimeUpdate.arrival = transit_realtime.TripUpdate.StopTimeEvent.create()
                if ('delay' in element && element.delay !== 0) {
                    newStopTimeUpdate.arrival.delay = element.totalDelay * 60
                } else if ('onTime' in element) {
                    newStopTimeUpdate.arrival.time = convertTimeStrToUNIXEpoch(element.arrival);
                } else if ('newTime' in element) {
                    newStopTimeUpdate.arrival.time = convertTimeStrToUNIXEpoch(element.newTime);
                }
            }

            trip_update.stopTimeUpdate.push(newStopTimeUpdate)
        }
    }

    if (!trip_update.trip.scheduleRelationship && (!trip_update.stopTimeUpdate || trip_update.stopTimeUpdate.length <= 0))
        throw new Error("Your trip update can't be empty.")

    return feed_entity

}

export function getUpdatesWithStopTimes(stopTimeUpdates, trip_stoptimes) {
    trip_stoptimes.sort((a, b) => a.stopSequence - b.stopSequence) // just a safeguard to sort by stop sequence
    stopTimeUpdates.sort((a, b) => a.stopSequence - b.stopSequence) // just a safeguard to sort by stop sequence

    // make sure the stop sequence is of type integer
    const stoptimes_output = [...trip_stoptimes]
    let totalDelay = 0
    for (const stoptimeUpdate of stopTimeUpdates) {
        const sequence = stoptimeUpdate.stopSequence
        const stoptime = stoptimes_output[sequence]
        if (stoptimeUpdate.arrival && stoptimeUpdate.arrival.delay) {
            let delay = Math.floor(stoptimeUpdate.arrival.delay / 60)
            stoptime.delay = -1 * (totalDelay - delay)
            totalDelay = delay
        }
        if (stoptimeUpdate.arrival && stoptimeUpdate.arrival.time) {

            const oldTime = convertTimeStrToUNIXEpoch(stoptime.arrival)
            const newTimeStr = convertDateToTimeString(new Date(stoptimeUpdate.arrival.time * 1000))
            const newTime = convertTimeStrToUNIXEpoch(newTimeStr)
            stoptime.newTime = newTimeStr
            totalDelay = Math.floor((newTime - oldTime) / 60)
        }
        if ('scheduleRelationship' in stoptimeUpdate && stoptimeUpdate.scheduleRelationship === transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship["SKIPPED"]) {
            stoptime.skip = true;
        }
        stoptime.totalDelay = totalDelay
    }
    totalDelay = 0
    stoptimes_output.forEach((value, index) => {
        if ("totalDelay" in value) {
            totalDelay = value.totalDelay
        }
        else {
            value.totalDelay = totalDelay
        }
    })
    return stoptimes_output
}


function StopTimeRow({ status_stop, stoptime, dispatchStopTimesChange }) {
    let changeStopOnTime = (onTime, index) => { dispatchStopTimesChange({ "onTime": onTime, "stopSequence": index }) }
    let changeTimeStop = (time, index) => { dispatchStopTimesChange({ "newTime": time, "stopSequence": index }) }
    let changeDelayStop = (delay, index) => { dispatchStopTimesChange({ "delay": delay, "stopSequence": index }) }


    return <tr className={status_stop === "Passed" ? "table-danger" : ""} key={stoptime.stopSequence}>
        <td>{stoptime.stopId}</td>
        <td className={status_stop && status_stop !== "Passed" ? "fs-3" : ""}>{status_stop}</td>
        <td className='d-flex flex-column align-items-center'>
            <input disabled={stoptime.skip || false} type='time' onInput={(e) => { changeTimeStop(e.currentTarget.value, stoptime.stopSequence) }} value={(stoptime.newTime && !stoptime.onTime) ? stoptime.newTime : stoptime.arrival} />
            <div>Arrives on Time:
                <input type='checkbox' onChange={(e) => { changeStopOnTime(e.target.checked, stoptime.stopSequence); }} checked={stoptime.onTime} /></div>
        </td>
        <td><input disabled={stoptime.skip || false} type='number' onChange={(e) => {
            if (!("onTime" in stoptime) || !stoptime.onTime)
                changeDelayStop(Number(e.currentTarget.value), stoptime.stopSequence)
        }} value={(!stoptime.onTime && stoptime.delay) || 0} />
            <span>{stoptime.delay && stoptime.delay !== 0 ? (stoptime.delay > 0 ? "Late" : "Early") : ""}</span></td>
        <td> Total Delay:{stoptime.totalDelay || 0} minutes </td>
        <td><input type='checkbox' onChange={(e) => { dispatchStopTimesChange({ "skip": e.target.checked, "stopSequence": stoptime.stopSequence }) }} checked={stoptime.skip || false} /></td>
    </tr>
}

function StopTimeTable({ stoptimes, dispatchStopTimesChange }) {
    let before = false;
    let current_time_str = convertDateToTimeString(new Date())
    return <table className='table border rounded table-responsive table-hover'>
        <thead>
            <tr>
                <th>Stop</th>
                <th></th>
                <th>Time</th>
                <th>{"Delay (min)"}</th>
                <th></th>
                <th>Skip stop?</th>
            </tr>
        </thead>
        <tbody>
            {stoptimes.map((stoptime) => {
                let status_stop = "Passed"
                if (convertTimeStrToUNIXEpoch(stoptime.arrival) + stoptime.totalDelay * 60 >= convertTimeStrToUNIXEpoch(current_time_str) && !before) {
                    before = true
                    status_stop = "🚆"

                } else if (before) {
                    status_stop = ""
                }
                return <StopTimeRow status_stop={status_stop} stoptime={stoptime} dispatchStopTimesChange={dispatchStopTimesChange} />
            })}
        </tbody>
    </table>

}


export function addTotalTime(stoptime) {
    let totalDelay = 0

    return totalDelay
}

export function TripUpdate() {
    const location = useLocation()
    const trip_update_feedentity = location.state

    let [alerts, popUpAlert] = useContext(alertsContext)
    // check if any state passed
    let [id, setEntityId] = useState("")// create a new uuid if a new trip update is being made
    const trip_update_inp = trip_update_feedentity ? trip_update_feedentity.tripUpdate : undefined

    let [cancelled, setCancelled] = useState(trip_update_inp && trip_update_inp.trip.scheduleRelationship === transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"])

    let [trip_id, setTripID] = useState(trip_update_inp ? trip_update_inp.trip.tripId : "")
    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])



    useEffect(() => {
        if (id === "") {
            setEntityId(trip_update_feedentity ? trip_update_feedentity.id : v4())
            return
        }
        setEntityId(v4())
    }, [trip_id])

    useEffect(() => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
            if (trip_id)
                disatchChangeStopTimes(getUpdatesWithStopTimes(trip_update_inp.stopTimeUpdate, await getStopTimesofTrip(trip_id)))
        }
        setData()
    }, [])

    let changeStopTimeRows = (rows, action) => {
        let totalDelay = 0;
        return rows.map((value, i) => {
            let newValue = { ...value }
            if ("stopSequence" in action && action.stopSequence == i) {
                newValue = { ...newValue, ...action }
            }
            if ("newTime" in newValue && !newValue.onTime) {
                const oldTime = convertTimeStrToUNIXEpoch(newValue.arrival)
                const newTime = convertTimeStrToUNIXEpoch(newValue.newTime)
                totalDelay = Math.floor((newTime - oldTime) / 60)
            } else if ("delay" in newValue) {
                totalDelay += newValue.delay
            }
            if (newValue.onTime)
                totalDelay = 0
            newValue.totalDelay = totalDelay
            return newValue
        })
    }

    let [stoptimes, disatchChangeStopTimes] = useReducer((state, action) => {
        if (Array.isArray(action))
            return changeStopTimeRows(action, {})
        return changeStopTimeRows(state, action)
    }, [])

    async function onClickTripID(new_trip_id) {
        setTripID(new_trip_id)
        disatchChangeStopTimes(await getStopTimesofTrip(new_trip_id))
    }

    return <div className='container flex-column d-flex align-items-center gap-5'>
        <div className=' d-flex flex-column gap-3 position-fixed top-50 start-0'>
            <Link className='btn btn-primary' to="/">⬅️ Go back to main page</Link>
            <button onClick={(e) => { window.location.reload() }} className='btn btn-primary' to="/">Create a new trip update</button>
        </div>
        <TripSearch routes={routes} services={services} setTripID={onClickTripID} />
        <div className='fs-2'>{trip_id}</div>
        {trip_id !== "" && <div className='form-check border rounded bg-danger'>
            <label className='form-check-label fs-3 ' htmlFor='cancel-checkbox'>Cancel Trip?</label>
            <input className='form-check-input' id='cancel-checkbox' type='checkbox' checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />

        </div>}
        {stoptimes.length > 0 ? <StopTimeTable disabled={cancelled} stoptimes={stoptimes} dispatchStopTimesChange={disatchChangeStopTimes} /> : ''}
        {trip_id && <button className="btn btn-success" onClick={async (e) => {
            await doActionWithAlert(async () => {
                let object = {
                    "id": id,
                    "trip_id": trip_id,
                    "stoptimes": stoptimes,
                    "cancelled": cancelled,
                }
                const trip_update_gtfs = convertDictToGTFSTripUpdate(object)
                await sendTripUpdate(trip_update_gtfs) // todo fix bug
                location.state = trip_update_gtfs
            }
                , "✅ Sucessfully saved Trip Update", popUpAlert)
        }
        } >Save</button>}
        <button className='btn btn-danger' onClick={(e) => {
            if (window.confirm("Are you sure you want to cancel? You might lose unsaved changes"))
                window.location = "/"
        }}> Cancel</button>

    </div>



}

