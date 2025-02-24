import { useState, useRef, useEffect } from 'react';
import { getTrips, getStops } from './Utils'

export function RouteSelect({ route, setRoute, routes }) {

    return <div className='container'>
        <select className='form-control' id='route_list' value={route} onChange={(event) => {
            setRoute(event.target.value)
        }}>
            {routes.map((val, i) => <option key={i} value={val.route_id}>{val.route_long_name}</option>)}
        </select>
    </div>

}

export function TripIdSeacher({ number, setSearchNumber }) {
    return <div className='container'>
        <label>Train Number</label>
        <input type='search' id='search_trip_number' value={number || ""} onChange={(event) => {
            setSearchNumber(event.target.value)
        }} />
    </div>
}

export function ServiceSelect({ setService, service, services }) {

    return <div className='container'>
        <select className='form-control' id='service_list' value={service} onChange={(event) => {
            setService(event.target.value)
        }}>
            {services.map((val, i) => <option key={i} value={val}>{val}</option>)}
        </select>
    </div>
}

export function TripSearch({route, setRoute, service, setService, setTripID, routes, services }) {

    let [number, setNumber] = useState(undefined)
    let [trips, setTrips] = useState([])

    function select_trip_callback(trip_id) {
        setTrips([])
        setTripID(trip_id)
    }
    const searchState = useRef(false)
        // need to pass this stuff with route, because otherwise it initially gives emoty value
        // that is because when routes are loaded, and the component rerenders, the route state has not yet been updated
    return <div className='d-flex flex-column justify-content-center'>
        <RouteSelect route={route} setRoute={setRoute} routes={routes} />
        <ServiceSelect service={service} setService={setService} services={services} />
        <TripIdSeacher number={number} setSearchNumber={setNumber} />
        <button className='btn btn-primary' disabled={searchState.current} onClick={async (e) => {
            searchState.current = true
            try {
                setTrips(await getTrips(route, service, number))
            } finally {
                searchState.current = false
            }
        }}>
            Search
        </button>
        {trips.length > 0 ? <TripIDResults select_trip_callback={select_trip_callback} trips={trips} /> : ''}
    </div>

}

export function StopSearch({ finish_search_callback }) {

    let [stop_name, setStopName] = useState("")
    let [stops, setStops] = useState([])
    const searchState = useRef(false)

    async function populateStops(stop_name_new) {
        var timeout = setTimeout(async () => {
            if (searchState.current)
                clearTimeout(timeout)
            searchState.current = true
            try {
                setStops(await getStops(stop_name_new))

            } finally {
                searchState.current = false
            }
        }, 1000)

    }


    async function addStop(stop_id) {
        setStopName("")
        setStops([])
        finish_search_callback(stop_id)
    }

    return <div className='form-group'>
        <input className='form-control' type='search' value={stop_name} onChange={async (e) => {
            setStopName(e.target.value)
            await populateStops(e.target.value)
        }} />
        <select className='form-control'>
            {stops.map((val, i) => <option onClick={(e) => { addStop(val.stop_id) }} key={i}>{val.stop_name}</option>)}
        </select>
    </div>
}

export function TripIDResults({ trips, select_trip_callback }) {
    return <div className='container'>
        <ul className="list-group">
            {trips.map((trip_id, i) => <li className='list-group-item' onClick={(e) => { select_trip_callback(trip_id) }} key={i}>{trip_id}</li>)}
        </ul>
    </div>
}