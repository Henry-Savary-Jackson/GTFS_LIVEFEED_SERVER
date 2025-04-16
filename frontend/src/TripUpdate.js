import { useState, useEffect, useReducer } from 'react';
import { transit_realtime } from "gtfs-realtime-bindings";
import { useLocation } from 'react-router-dom'
import { TripSearch } from './Search';
import { getServices, convertDateToTimeString, getRoutes, getStopTimesofTrip, sendTripUpdate, convertTimeStrToUNIXEpoch } from './Utils';
import { v4 } from 'uuid'


export function convertDictToGTFSTripUpdate(dict) {
    const feed_entity = transit_realtime.FeedEntity.create()
    const trip_update = transit_realtime.TripUpdate.create()
    feed_entity.tripUpdate = trip_update
    feed_entity.id = dict.id

    trip_update.trip = { "tripId": dict.trip_id }
    trip_update.timestamp = Math.floor(new Date().getTime()/1000)
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
                    newStopTimeUpdate.arrival.delay = element.delay * 60
                } else if ('onTime' in element) {
                    newStopTimeUpdate.arrival.time = convertTimeStrToUNIXEpoch(element.time);
                } else if ('newTime' in element) {
                    newStopTimeUpdate.arrival.time = convertTimeStrToUNIXEpoch(element.newTime);
                }
            }

            trip_update.stopTimeUpdate.push(newStopTimeUpdate)
        }
    }

    return feed_entity

}

export function getUpdatesWithStopTimes(stopTimeUpdates, trip_stoptimes) {
    trip_stoptimes.sort((a, b) => a.stopSequence - b.stopSequence) // just a safeguard to sort by stop sequence

    // make sure the stop sequence is of type integer
    const stoptimes_output = [...trip_stoptimes]

    for (const stoptimeUpdate of stopTimeUpdates) {
        const sequence = stoptimeUpdate.stopSequence
        if ('arrival' in stoptimeUpdate && 'delay' in stoptimeUpdate.arrival) {
            stoptimes_output[sequence].delay = Math.floor(stoptimeUpdate.arrival.delay / 60)
        }
        if ('arrival' in stoptimeUpdate && 'time' in stoptimeUpdate.arrival) {
            stoptimes_output[sequence].time = convertDateToTimeString(new Date(stoptimeUpdate.arrival.time * 1000))
        }
        if ('scheduleRelationship' in stoptimeUpdate && stoptimeUpdate.scheduleRelationship === transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship["SKIPPED"]) {
            stoptimes_output[sequence].skip = true;
        }
    }
    return stoptimes_output
}


function StopTimeRow({ stoptime, dispatchStopTimesChange }) {
    let changeStopOnTime = (onTime, index) => { dispatchStopTimesChange({ "onTime": onTime, "stopSequence": index }) }
    let changeTimeStop = (time, index) => { dispatchStopTimesChange({ "newTime": time, "stopSequence": index }) }
    let changeDelayStop = (delay, index) => { dispatchStopTimesChange({ "delay": delay, "stopSequence": index }) }

    return <tr key={stoptime.stopSequence}>
        <td>{stoptime.stopId}</td>
        <td className='d-flex flex-column align-items-center'>
            <input disabled={stoptime.skip || false} type='time' onInput={(e) => { changeTimeStop(e.currentTarget.value, stoptime.stopSequence) }} value={(stoptime.newTime && !stoptime.onTime) ? stoptime.newTime : stoptime.time} />
            <div>Arrives on Time:
                <input type='checkbox' onChange={(e) => { changeStopOnTime(e.target.checked, stoptime.stopSequence); }} checked={stoptime.onTime} /></div>
        </td>
        <td><input disabled={stoptime.skip || false} type='number' onChange={(e) => {
            if (!("onTime" in stoptime) || !stoptime.onTime)
                changeDelayStop(Number(e.currentTarget.value), stoptime.stopSequence)
        }} value={(!stoptime.onTime && stoptime.delay) || 0} /><span>{stoptime.delay && stoptime.delay !== 0 ? (stoptime.delay > 0 ? "Late" : "Early") : ""}</span> </td>
        <td><input type='checkbox' onChange={(e) => { dispatchStopTimesChange({ "skip": e.target.checked, "stopSequence": stoptime.stopSequence }) }} checked={stoptime.skip || false} /></td>
    </tr>
}

function StopTimeTable({ stoptimes, dispatchStopTimesChange }) {

    return <table className='table table-responsive'>
        <thead>
            <tr>
                <th>Stop</th>
                <th>Time</th>
                <th>{"Delay (min)"}</th>
                <th>skip</th>
            </tr>
        </thead>
        <tbody>
            {stoptimes.map((stoptime) => <StopTimeRow stoptime={stoptime} dispatchStopTimesChange={dispatchStopTimesChange} />)}
        </tbody>
    </table>

}


export function TripUpdate() {
    const trip_update_feedentity = useLocation().state
    // check if any state passed
    let [id, setEntityId] = useState("")// create a new uuid if a new trip update is being made
    const trip_update_inp = trip_update_feedentity ? trip_update_feedentity.tripUpdate : undefined

    let [cancelled, setCancelled] = useState(trip_update_inp && trip_update_inp.trip.scheduleRelationship === transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"])

    let [trip_id, setTripID] = useState(trip_update_inp ? trip_update_inp.trip.tripId : "")
    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])

    useEffect(() => {
        if (id == "") {
            setEntityId(trip_update_feedentity ? trip_update_feedentity.id : v4())
            return
        }
        setEntityId(v4())
    }, [trip_id])

    useEffect(async () => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
            if (trip_id)
                disatchChangeStopTimes(getUpdatesWithStopTimes(trip_update_inp.stopTimeUpdate, await getStopTimesofTrip(trip_id)))
        }
        await setData()
    }, [])

    let [stoptimes, disatchChangeStopTimes] = useReducer((state, action) => {
        if (Array.isArray(action))
            return action.map(val => val)

        return state.map((value, i) => {
            if ("stopSequence" in action && action.stopSequence === i) {
                return { ...value, ...action }
            }
            return value
        })
    }, [])

    async function onClickTripID(new_trip_id) {
        setTripID(new_trip_id)
        disatchChangeStopTimes(await getStopTimesofTrip(new_trip_id))
    }

    return <div className='container flex-column d-flex align-items-center gap-5'>
        <TripSearch routes={routes} services={services} setTripID={onClickTripID} />
        <div>{trip_id}</div>
        {trip_id !== "" && <div className='form-check'>
            <label className='form-check-label' htmlFor='cancel-checkbox'>Cancel Trip?</label>
            <input className='form-check-input' id='cancel-checkbox' type='checkbox' checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />

        </div>}
        {stoptimes.length > 0 ? <StopTimeTable disabled={cancelled} stoptimes={stoptimes} dispatchStopTimesChange={disatchChangeStopTimes} /> : ''}
        <button className="btn btn-success" onClick={async (e) => {
            let object = {
                "id": id,
                "trip_id": trip_id,
                "stoptimes": stoptimes,
                "cancelled": cancelled
            }
            try {
                let trip_update_gtfs = convertDictToGTFSTripUpdate(object)
                await sendTripUpdate(trip_update_gtfs)
                alert("Sucessfully saved")
            } catch (error) {
                alert(error.message || error)
            }

            // save object
        }} >Save</button>
        <button className='btn btn-danger' onClick={(e) => {
            if (window.confirm("Are you sure you want to cancel? You might lose unsaved changes"))
                window.location = "/"
        }}> Cancel</button>

    </div>



}

