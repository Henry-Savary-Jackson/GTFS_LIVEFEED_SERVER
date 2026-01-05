import { useState, useRef } from 'react';
import { getTrips, getStops, convertDateToTimeString } from '../../utils/RequestUtils'


export function TripSearch({ setTripID, routes, services }) {

    let [number, setNumber] = useState(undefined)
    let [trips, setTrips] = useState([])
    let [route, setRoute] = useState("")
    let [service, setService] = useState("")
    const searchState = useRef(false)

    function select_trip_callback(trip_id) {
        setTrips([])
        setTripID(trip_id)
    }
    async function setTripsCallback(new_number) {
        searchState.current = true
        let now = new Date()
        try {
            let current_time_str = convertDateToTimeString(now)
            setTrips(await getTrips(route, null, new_number === "" ? undefined : new_number.replace(/^0+/, ''), current_time_str))
        } finally {
            searchState.current = false
        }
    }
    function setNumberCallback(new_number) {
        setNumber(new_number)
        var timeOut = setTimeout(async () => {
            if (searchState.current)
                clearTimeout(timeOut)
            setTripsCallback(new_number)
        }, 250)
    }
    // need to pass this stuff with route, because otherwise it initially gives emoty value
    // that is because when routes are loaded, and the component rerenders, the route state has not yet been updated
    return <div className='d-flex gap-3 fs-4 flex-column justify-content-center'>
        <RouteSelect route={route} setRoute={setRoute} routes={routes} />
        <ServiceSelect service={service} setService={setService} services={services} />
        <TripIdSeacher number={number} setSearchNumber={setNumberCallback} />
        <button className='btn btn-primary' disabled={searchState.current} onClick={async (e) => {
            setTripsCallback(number)
        }}>
            Search
        </button>
        {trips.length > 0 ? <TripIDResults select_trip_callback={select_trip_callback} trips={trips} /> : ''}
    </div>

}

function TripIDResults({ trips, select_trip_callback }) {
    return <div className='fs-6 container'>
        <ul className="list-group">
            {trips.map((trip_object, i) => <li className='list-group-item' style={"inprogress" in trip_object ? { "background": trip_object["inprogress"] === 2 ? "indianred" : trip_object["inprogress"] === 0 ? "lightgreen" : "white", "color": trip_object["inprogress"] === 2 ? "white" : "black" } : {}} onClick={(e) => { select_trip_callback(trip_object["trip_id"]) }} key={i}>{trip_object["trip_id"]} {trip_object["inprogress"] === 0 ? "In progress" : trip_object["inprogress"] === 1 ? "Yet to start" : "Finished"} &emsp;  End Terminus:{trip_object["endTerminus"]}</li>)}
        </ul>
    </div>
}