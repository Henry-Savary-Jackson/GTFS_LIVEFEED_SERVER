
export default function TripUpdateFeedEntityRow({ entity, delete_feed_entity_callback }) {

  let [stoptimes, setStoptime] = useState([])

  useEffect(() => {
    (async () => {
      if (entity)
        setStoptime(getUpdatesWithStopTimes(entity.tripUpdate.stopTimeUpdate, await getStopTimesofTrip(entity.tripUpdate.trip.tripId)))
    })()

  }, [entity])
  let [alerts, popUpAlert] = useContext(alertsContext)

  let first_stoptime = stoptimes && stoptimes.length > 0 ? stoptimes[0] : null
  let last_stoptime = stoptimes && stoptimes.length > 0 ? stoptimes[stoptimes.length - 1] : null
  let first = first_stoptime ? convertTimeStrToDate(first_stoptime.newTime || first_stoptime.arrival) : null
  let last = last_stoptime ? convertTimeStrToDate(last_stoptime.newTime || last_stoptime.arrival) : null

  let first_minutes = first && first.valueOf() / (1000 * 60)
  if (first_stoptime && !first_stoptime.newTime)
    first_minutes += first_stoptime.totalDelay
  let last_minutes = last && last.valueOf() / (1000 * 60)
  if (last_minutes && !last_stoptime.newTime)
    last_minutes += last_stoptime.totalDelay
  let now = new Date()
  let now_minutes = now.valueOf() / (1000 * 60)

  let modified_datetime = entity.tripUpdate.timestamp ? new Date(entity.tripUpdate.timestamp * 1000) : undefined
  let modified = modified_datetime ? `${modified_datetime.toDateString()} ${modified_datetime.toLocaleTimeString()}` : ``


  let css_class = ""
  let trip_state = ""

  let cancelledStops = stoptimes && stoptimes.length > 0 ? stoptimes.filter((stoptime) => stoptime.skip).map((stoptime) => stoptime.stopId) : []

  let [cancelled, setCancelled] = useState((entity && entity.tripUpdate.trip.scheduleRelationship === transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"]) || false)
  let [showDetail, setShowDetail] = useState(false)


  // add delay 
  if (first_minutes && last_minutes) {
    if (first_minutes >= now_minutes) {
      css_class = "table-warning"
      trip_state = "Trip yet to start"
    } else if (last_minutes >= now_minutes) {
      css_class = "table-success"
      trip_state = "Trip in progress"
    } else {
      css_class = "table-danger"
      trip_state = "Trip finished"
    }
  }



  return <><tr onDoubleClick={(e) => { setShowDetail(!showDetail) }} className={css_class} key={entity.id} >
    <td >{entity.tripUpdate.trip.tripId}</td>
    <td >{trip_state}</td>
    <td>{modified}</td>
    <td><Link className='btn btn-primary' to="/trip_update" state={entity} >Edit</Link> </td>
    <td ><DeleteFeedEntityButton entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /></td>
  </tr>
    {showDetail && <div className='d-flex flex-row justify-content-center align-items-center'>
      <div className='form-group flex-row justify-content-center align-items-center '>
        <label className='form-check-label fs-5 ' htmlFor='cancel-checkbox'>Cancel Trip?</label>
        <input className='form-check-input' id='cancel-checkbox' type='checkbox' checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />
      </div>
      <span>Total Delay:{(last_stoptime && last_stoptime.totalDelay) || 0} minutes</span>
      <ul>Cancelled stops:
        {cancelledStops.map((stop_id) => <li>{stop_id}</li>)}
      </ul>
      <button className='btn btn-success' onClick={async (e) => {
        entity.tripUpdate.trip.scheduleRelationship = transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"]
        doActionWithAlert(async () => {
          await sendTripUpdate(entity)
        }, "✅ Sucessfully saved", popUpAlert)

      }}>Save</button>
    </div>}
  </>
}