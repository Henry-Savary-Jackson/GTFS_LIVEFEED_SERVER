import { useState, useEffect, useReducer } from 'react';
import { transit_realtime } from "gtfs-realtime-bindings";
import { useLocation } from 'react-router-dom'
import { TripSearch } from './Search';
import { getServices, deleteFeedEntity, getRoutes, getStopTimesofTrip, sendTripUpdate } from './Utils';
import { v4 } from 'uuid'


export function convertDictToGTFSTripUpdate(dict) {
    const feed_entity = transit_realtime.FeedEntity.create()
    const trip_update = transit_realtime.TripUpdate.create()
    feed_entity.tripUpdate = trip_update
    feed_entity.id = dict.id

    trip_update.trip = { "tripId": dict.trip_id }
    if (dict.cancelled)
        trip_update.scheduleRelationship = transit_realtime.TripDescriptor.ScheduleRelationship["CANCELLED"];

    for (let i = 0; i < dict.stoptimes.length; i++) {
        const element = dict.stoptimes[i]
        if ('delay' in element || 'skip' in element || 'newTime' in element) {
            const newStopTimeUpdate = transit_realtime.TripUpdate.StopTimeUpdate.create()
            newStopTimeUpdate.arrival = transit_realtime.TripUpdate.StopTimeEvent.create()
            newStopTimeUpdate.stopSequence = i
            if ('delay' in element)
                newStopTimeUpdate.arrival.delay = element.delay

            if ('skip' in element && element.skip)
                newStopTimeUpdate.scheduleRelationship = transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship["SKIPPED"]

            if ('newTime' in element) {
                let [hours, minutes] = element.time.split(':')
                let time = new Date()
                time.setHours(hours)
                time.setMinutes(minutes)
                newStopTimeUpdate.arrival.time = time.valueOf() / 1000
            }
            trip_update.stopTimeUpdate.push(newStopTimeUpdate)
        }
    }
    return feed_entity

}

export function getUpdatesWithStopTimes(stopTimeUpdates, trip_stoptimes) {
    trip_stoptimes.sort((a, b) => a.stopSequence - b.stopSequence)

    const stoptimes_output = [...trip_stoptimes]

    for (const stoptimeUpdate of stopTimeUpdates) {
        const sequence = stoptimeUpdate.stopSequence
        if ('arrival' in stoptimeUpdate && 'delay' in stoptimeUpdate.arrival) {
            stoptimes_output[sequence].delay = stoptimeUpdate.arrival.delay
        }
        if ('arrival' in stoptimeUpdate && 'time' in stoptimeUpdate.arrival) {
            stoptimes_output[sequence].time = new Date(stoptimeUpdate.arrival.time * 1000).toTimeString()
        }
        if ('scheduleRelationship' in stoptimeUpdate && stoptimeUpdate.scheduleRelationship == transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship["SKIPPED"]) {
            stoptimes_output[sequence].skip = true;
        }
    }
    return stoptimes_output
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
            {stoptimes.map((val, i) => <tr key={i}>
                <td>{val.stopId}</td>
                <td><input disabled={val.skip || false} type='time' onChange={(e) => { dispatchStopTimesChange({ "newTime": e.target.value, "stopSequence": i }) }} value={val.newTime ? val.newTime : val.time} /></td>
                <td><input disabled={val.skip || false} type='number' onChange={(e) => { dispatchStopTimesChange({ "delay": Number(e.target.value), "stopSequence": i }) }} value={val.delay || 0} /><span>{val.delay > 0 ? "Late" : "Early"}</span> </td>
                <td><input type='checkbox' onChange={(e) => { dispatchStopTimesChange({ "skip": e.target.checked, "stopSequence": i }) }} value={val.skip || false} /></td>
            </tr>
            )}
        </tbody>
    </table>


}


export function TripUpdate() {
    const trip_update_feedentity = useLocation().state
    // check if any state passes
    let id = trip_update_feedentity ? trip_update_feedentity.id : v4()
    const trip_update_inp = trip_update_feedentity? trip_update_feedentity.tripUpdate : undefined

    let [cancelled, setCancelled] = useState(trip_update_inp && trip_update_inp.trip.scheduleRelationship == transit_realtime.TripDescriptor.ScheduleRelationship["CANCELLED"])

    let [trip_id, setTripID] = useState(trip_update_inp ? trip_update_inp.trip.tripId : "")
    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])

    let [stoptimes, disatchChangeStopTimes] = useReducer((state, action) => {
        if (Array.isArray(action))
            return action.map(val => val)

        return state.map((value, i) => {
            if ("stopSequence" in action && action.stopSequence == i) {
                return { ...value, ...action }
            }
            return value
        })
    }, [])


    useEffect(() => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
            if (trip_id)
                disatchChangeStopTimes(getUpdatesWithStopTimes(trip_update_inp.stopTimeUpdate, await getStopTimesofTrip(trip_id)))
        }
        setData()
    }, [])


    async function onClickTripID(new_trip_id) {
        setTripID(new_trip_id)
        disatchChangeStopTimes(await getStopTimesofTrip(new_trip_id))
    }



    return <div className='flex-column d-flex align-items-center'>
        <TripSearch routes={routes} services={services} setTripID={onClickTripID} />
        <div>{trip_id}</div>
        {trip_id !== "" && <div className='form-group'>
            <label htmlFor='#cancel-checkbox'>Cancel Trip?</label>
            <input id='cancel-checkbox' type='checkbox' value={cancelled} onChange={(e) => setCancelled(e.target.value)} />

        </div>}
        {stoptimes.length > 0 ? <StopTimeTable disabled={cancelled} stoptimes={stoptimes} dispatchStopTimesChange={disatchChangeStopTimes} /> : ''}
        <button className="btn" onClick={async (e) => {
            let object = {
                "id": id,
                "trip_id": trip_id,
                "stoptimes": stoptimes,
                "cancelled": cancelled
            }
            let trip_update_gtfs = convertDictToGTFSTripUpdate(object)
            await sendTripUpdate(trip_update_gtfs)
            // save object
        }} >Save</button>
        <button className='btn' onClick={async (e) => {
            if (trip_update_inp) {
                await deleteFeedEntity(id)
            } else {
                window.location = "/"
            }
        }}> {trip_update_inp ? "Delete" : "Cancel"}</button>

    </div>



}

