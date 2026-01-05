

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

