import { useState, useRef } from 'react';
import { getTrips, getStops } from './Utils'

export function RouteSelect({ route, setRoute, routes }) {

    return <div className='container'>
        <label htmlFor='route_list' >Routes:</label>
        <select className='form-control' id='route_list' value={route} onChange={(event) => {
            setRoute(event.target.value)
        }}>
            <option key="All" value="" >All</option>
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
        <label htmlFor='service_list'>Service:</label>
        <select className='form-control' id='service_list' value={service} onChange={(event) => {
            setService(event.target.value)
        }}>
            <option key="All" value="" >All</option>
            {services.map((val, i) => <option key={i} value={val}>{val}</option>)}
        </select>
    </div>
}

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
        try {
            let current_datetime_str = new Date().toISOString()
            let current_time_str = current_datetime_str.slice(current_datetime_str.indexOf("T")+1, current_datetime_str.lastIndexOf("."))
            setTrips(await getTrips(route, service, new_number, current_time_str))
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
    return <div className='d-flex flex-column justify-content-center'>
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


export function TripUpdateFilter({ setNumber, route, number, setRoute, routes }) {
    return <div className='container d-flex flex-column align-items-center gap-3'>
        <TripIdSeacher number={number} setSearchNumber={setNumber} />
        <RouteSelect route={route} setRoute={setRoute} routes={routes} />
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
        }, 250)

    }


    async function addStop(stop_id) {
        setStopName("")
        setStops([])
        finish_search_callback(stop_id)
    }

    return <div className='form-group'>
        <label htmlFor='stop-search-input' >Search for stop:</label>
        <input id="stop-search-input" className='form-control' type='search' value={stop_name} onChange={async (e) => {
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