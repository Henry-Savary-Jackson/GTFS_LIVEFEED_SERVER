import { useState, useRef } from 'react';
import { getTrips, getStops, convertDateToTimeString } from './Utils'

export function RouteSelect({ route, setRoute, routes }) {

    return <div className='container d-flex flex-column gap-3'>
        <label htmlFor='route_list' >Routes:</label>
        <select className='form-control' id='route_list' value={route} onChange={(event) => {
            setRoute(event.target.value)
        }}>
            <option key="All" value="" >All</option>
            {routes.map((route, i) => <option style={route.route_color? {"background": `#${route.route_color}`}: {}} key={i} value={route.route_id}>{route.route_long_name}</option>)}
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

    return <div className='container d-flex flex-column gap-3 '>
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
            let current_time_str =  convertDateToTimeString(new Date())
            setTrips(await getTrips(route, new Date().getDay() > 5? "WE":"WD", new_number === ""? undefined: new_number, current_time_str))
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


export function TripUpdateFilter({ setNumber, route, number, setRoute, routes }) {
    return <div className='container d-flex flex-column align-items-center gap-3'>
        <span className='fs-4 text-center'>Filter trips:</span>
        <TripIdSeacher number={number} setSearchNumber={setNumber} />
        <RouteSelect route={route} setRoute={setRoute} routes={routes} />
    </div>

}

export function StopSearch({ finish_search_callback }) {

    let [stop_name, setStopName] = useState("")
    let [stops, setStops] = useState([])
    let [stop_id, setStopId] = useState("")
    const searchState = useRef(false)

    async function populateStops(stop_name_new) {
        var timeout = setTimeout(async () => {
            if (searchState.current)
                clearTimeout(timeout)
            searchState.current = true
            try {
                let stops  = await getStops(stop_name_new)
                setStops(stops)
                setStopId(stops.length>0? stops[0].stop_id : "")
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

    return <div className='form-group d-flex flex-column align-items-center gap-2'>
        <label htmlFor='stop-search-input' >Search for stop by name:</label>
        <input id="stop-search-input" className='form-control' type='search' value={stop_name} onChange={async (e) => {
            setStopName(e.target.value)
            await populateStops(e.target.value)
        }} />
        <label htmlFor='stop-search-results'>Stops found:</label>
        <select id="stop-search-results" className='form-control'>
            {stops.map((val, i) => <option enClick={(e) => { setStopId(val.stop_id) }} key={i}>{val.stop_name}</option>)}
        </select>
        <button className='btn btn-primary' disabled={!Boolean(stop_id)} onClick={(e)=>{
            if (stop_id){
                addStop(stop_id)
            }
        }}>Add Stop</button>
    </div>
}

export function TripIDResults({ trips, select_trip_callback }) {
    return <div  className='fs-6 container'>
        <ul className="list-group">
            {trips.map((trip_object, i) => <li className='list-group-item' style={"inprogress" in trip_object? {"background": trip_object["inprogress"] === 2 ?"indianred":trip_object["inprogress"]===0? "lightgreen": "white" , "color":trip_object["inprogress"] === 2? "white":"black"  } : {}} onClick={(e) => { select_trip_callback(trip_object["trip_id"]) }} key={i}>{trip_object["trip_id"]} { trip_object["inprogress"] === 0? "In progress" : trip_object["inprogress"] === 1? "Yet to start":  "Finished"} &emsp;  End Terminus:{trip_object["endTerminus"]}</li>)} 
        </ul>
    </div>
}