import { useState, useEffect, useReducer } from 'react';
import {transit_realtime} from "gtfs-realtime-bindings";
import { useLocation } from 'react-router-dom'
import { TripSearch } from './Search';
import { getServices, deleteFeedEntity, getRoutes, getStopTimesofTrip, sendTripUpdate } from './Utils';
import { v4 } from 'uuid'


export function convertDictToGTFSTripUpdate(dict) {
    const feed_entity = transit_realtime.TripUpdate.create()
    const trip_update = transit_realtime.TripUpdate.create()
    feed_entity.id = dict.id

    trip_update.trip = { "trip_id": dict.trip_id }
    if ("cancelled" in dict)
        trip_update.scheduleRelationship = dict.cancelled


    for (let i = 0; i < dict.stoptimes.length; i++) {
        const element = dict.stoptimes[i]
        if ('delay' in element || 'skip' in element || 'time' in element) {
            const newStopTimeUpdate = transit_realtime.TripUpdate.StopTimeUpdate.create()
            newStopTimeUpdate.stopSequence = i
            if ('delay' in element)
                newStopTimeUpdate.arrival.delay = element.delay
            if ('skip' in element && element.skip)
                newStopTimeUpdate.scheduleRelationsip = "SKIPPED"
            if ('time' in element) {
                let [hours, minutes] = element.time.split(':')
                let time = new Date()
                time.setHours(hours)
                time.setMinutes(minutes)
                newStopTimeUpdate.arrival.time = time.getTime() / 1000
            }
            trip_update.stopTimeUpdate.append(newStopTimeUpdate)
        }

    }

    return feed_entity

}

export function TripUpdateGTFSToDict(tripUpdate, trip_stoptimes) {
    const output = {}
    output.trip_id = tripUpdate.trip.tripId
    if (tripUpdate.scheduleRelationship === "CANCELLED") {
        output.cancelled = true
    }
    const stopTimeUpdates = tripUpdate.stopTimeUpdates
    output.stoptimes = trip_stoptimes; // copy 
    output.stoptimes.sort((a, b) => a.stopSequence - b.stopSequence)

    for (const stoptimeUpdate of stopTimeUpdates) {
        const sequence = stoptimeUpdate.stopSequence
        if ('arrival' in stoptimeUpdate && 'delay' in stoptimeUpdate.arrival) {
            output.stoptimes[sequence].delay = stoptimeUpdate.arrival.delay
        }
        if ('arrival' in stoptimeUpdate && 'delay' in stoptimeUpdate.arrival) {
            output.stoptimes[sequence].time = new Date(stoptimeUpdate.arrival.time * 1000).toTimeString()
        }
        if ('scheduleRelationship' in stoptimeUpdate && stoptimeUpdate.scheduleRelationship == "SKIPPED") {
            output.stoptimes[sequence].skip = true;
        }
    }
    return output
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
                <td><input type='time' onChange={(e)=>{dispatchStopTimesChange({"time":e.target.value, "stopSequence":i})}} value={val.time} /></td>
                <td><input type='number' onChange={(e)=>{dispatchStopTimesChange({"delay":e.target.value, "stopSequence":i})}} value={val.delay} /><span>{val.delay > 0 ? "Late" : "Early" }</span> </td>
                <td><input type='checkbox' onChange={(e)=>{dispatchStopTimesChange({"skip":e.target.checked, "stopSequence":i})}} value={val.skip || false} /></td>
            </tr>
            )}
        </tbody>
    </table>


}


export function TripUpdate() {
    const trip_update_inp = useLocation().state
    // check if any state passes
    let id = trip_update_inp ? trip_update_inp.id : v4()
    let [trip_id, setTripID] = useState(trip_update_inp ? trip_update_inp.trip.tripId : "")

    let [stoptimes, disatchChangeStopTimes] = useReducer( (state , action)=>{
        if (Array.isArray( action))
            return action.map(val => val)

        return state.map((value, i)=>{
            if (action.sequence == i){
                return {...value, ...action}
            }
            return value
        })
    }, [])

    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])


    async function onClickTripID(new_trip_id) {
        setTripID(new_trip_id)
        disatchChangeStopTimes(await getStopTimesofTrip(new_trip_id))
    }

    useEffect(() => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
        }
        setData()
    }, [])

    return <div className='flex-column d-flex align-items-center'>
        <TripSearch routes={routes} services={services} setTripID={onClickTripID} />
        <span>{trip_id}</span>
        {stoptimes.length > 0 ? <StopTimeTable stoptimes={stoptimes} dispatchStopTimesChange={disatchChangeStopTimes} /> : ''}
        <button className="btn" onClick={async (e) => {
            let object = {
                "id": id,
                "trip_id": trip_id,
                "stoptimes": stoptimes
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

