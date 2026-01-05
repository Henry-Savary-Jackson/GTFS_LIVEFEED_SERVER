
export function TripIdSeacher({ number, setSearchNumber }) {
    return <div className='container'>
        <label>Train Number</label>
        <input type='search' id='search_trip_number' value={number || ""} onChange={(event) => {
            setSearchNumber(event.target.value)
        }} />
    </div>
}

export function TripIDResults({ trips, select_trip_callback }) {
    return <div  className='fs-6 container'>
        <ul className="list-group">
            {trips.map((trip_object, i) => <li className='list-group-item' style={"inprogress" in trip_object? {"background": trip_object["inprogress"] === 2 ?"indianred":trip_object["inprogress"]===0? "lightgreen": "white" , "color":trip_object["inprogress"] === 2? "white":"black"  } : {}} onClick={(e) => { select_trip_callback(trip_object["trip_id"]) }} key={i}>{trip_object["trip_id"]} { trip_object["inprogress"] === 0? "In progress" : trip_object["inprogress"] === 1? "Yet to start":  "Finished"} &emsp;  End Terminus:{trip_object["endTerminus"]}</li>)} 
        </ul>
    </div>
}