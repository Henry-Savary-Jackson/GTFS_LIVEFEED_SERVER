import { useState, useEffect, useReducer, useContext } from 'react';
import { sendTripUpdate, getFeedMessage, logout, getHtmlForEntity, deleteFeedEntity, setCSRFToken, get_csrf, getTripsToRouteID, getRoutes, getRoutesIDToNames, getStopTimesofTrip, convertTimeStrToDate, convertTimeStrToUNIXEpoch, doActionWithAlert } from './Utils'
import { addTotalTime, getTotalTime, getUpdatesWithStopTimes, TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserContext, RolesContext, alertsContext } from './Globals';
import { transit_realtime } from "gtfs-realtime-bindings"
import { LoginForm } from './Login';
import { useCookies } from 'react-cookie'
import { UploadsGTFS } from './FileUpload';
import { TripUpdateFilter } from './Search';
import { AddUserForm } from './AddUser';
import { AlertsProvider } from './Alerts';



function TripUpdateFeedEntityRow({ index, stoptimes = undefined, entity, delete_feed_entity_callback }) {

  let [alerts, popUpAlert] = useContext(alertsContext)

  const stop_times_at_index = stoptimes && stoptimes.length > 0 ? stoptimes[index].stoptimes : null
  let first = stop_times_at_index ? convertTimeStrToDate(stop_times_at_index[0].time) : null

  let last = stop_times_at_index ? convertTimeStrToDate(stop_times_at_index[stop_times_at_index.length - 1].time) : null

  let modified_datetime = entity.tripUpdate.timestamp ? new Date(entity.tripUpdate.timestamp * 1000) : undefined
  let modified = modified_datetime ? `${modified_datetime.toDateString()} ${modified_datetime.toLocaleTimeString()}` : ``

  let now = new Date()

  let css_class = ""
  let trip_state = ""

  let totalDelay = getTotalTime(stop_times_at_index)
  let cancelledStops = stop_times_at_index ? stop_times_at_index.filter((stoptime) => stoptime.skip).map((stoptime) => stoptime.stopId) : []

  let current_delay = 0
  if (stop_times_at_index){
    for (const stoptime of stop_times_at_index){
      current_delay += addTotalTime(stoptime) 
      if (convertTimeStrToDate(stoptime.time).valueOf()/1000 + current_delay* 60 >= now.valueOf()/1000 )
        break;
    }
  }

  let [cancelled, setCancelled] = useState((entity && entity.tripUpdate.trip.scheduleRelationship === transit_realtime.TripDescriptor.ScheduleRelationship["CANCELED"]) || false)
  let [showDetail, setShowDetail] = useState(false)


  let first_minutes = first && first.valueOf()/(1000*60)
  let last_minutes = last && last.valueOf()/(1000*60) 
  let now_minutes = now.valueOf()/(1000*60)

  // add delay 
  if (first_minutes && last_minutes) {
    if ( current_delay + first_minutes >= now_minutes ) {
      css_class = "table-warning"
      trip_state = "Trip yet to start"
    } else if (last_minutes+ current_delay > now_minutes && first_minutes+ current_delay < now_minutes) {
      css_class = "table-success"
      trip_state = "Trip in progress"
    } else if (last_minutes +current_delay > now_minutes && first_minutes + current_delay < now_minutes) {
    } else if (last_minutes +current_delay <= now_minutes) {
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
      <span>Total Delay:{totalDelay} minutes</span>
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
function ServiceAlertFeedEntityRow({ entity, delete_feed_entity_callback }) {

  let activePeriod = entity.alert && entity.alert.activePeriod && entity.alert.activePeriod.length > 0 ? entity.alert.activePeriod[0] : null;
  let start_date = entity.alert && activePeriod && activePeriod.start ? new Date(activePeriod.start * 1000) : null
  let end_date = entity.alert && activePeriod && activePeriod.end ? new Date(activePeriod.end * 1000) : null
  let informed_entities = entity.alert.informedEntity
  let now = new Date()

  function returnTime() {
    if (!activePeriod)
      return <td>No active period</td>

    let start = start_date ? `${start_date.toDateString()} ${start_date.toLocaleTimeString()}` : "Unspecified"
    let end = end_date ? `${end_date.toDateString()} ${end_date.toLocaleTimeString()}` : "Unspecified"
    return <td><ul>
      <li>Start:{start}</li>
      <li>End:{end}</li>
    </ul>
    </td>
  }
  let css_class = ""
  if (start_date && start_date < now && (!end_date || (end_date && end_date > now))) {
    css_class = "table-success"
  }
  if (end_date && end_date <= now) {
    css_class = "table-danger"
  }
  else if (start_date && start_date >= now) {
    css_class = "table-warning"
  }

  return <tr className={css_class} key={entity.id} >
    {returnTime()}
    <td ><ul>{informed_entities.map((entity, i) => <li key={i}>{getHtmlForEntity(entity)}</li>)}</ul></td>
    <td>{transit_realtime.Alert.Cause[entity.alert.cause]}</td>
    <td>{transit_realtime.Alert.Effect[entity.alert.effect]}</td>
    <td><Link className='btn btn-primary' to="/service_alert" state={entity} >Edit</Link> </td>
    <td ><DeleteFeedEntityButton entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /></td>
  </tr>
}


function FeedEntityRow({ index, stoptimes = undefined, entity, delete_feed_entity_callback }) {
  return entity.tripUpdate ? <TripUpdateFeedEntityRow index={index} stoptimes={stoptimes} entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /> : <ServiceAlertFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />
}

function DeleteFeedEntityButton({ entity, delete_feed_entity_callback }) {

  let [alerts, popUpAlert] = useContext(alertsContext)
  return (<button className='btn btn-danger' onClick={async (e) => {
    if (window.confirm("Are you sure you want to delete")) {
      await doActionWithAlert(async () => {
        delete_feed_entity_callback(entity.id, entity.tripUpdate ? "updates" : "alerts", false)
      }, "Successfully deleted.", popUpAlert)
    }
  }
  }>X</button>)
}

export function Feed() {
  const [feed_alerts, setFeedAlerts] = useState([])
  const [feed_type, setFeedType] = useState("alerts")
  const [feed_updates, setFeedUpdates] = useState([])
  async function set_feed(type) {
    let feed_message = await getFeedMessage(type)
    switch (type) {
      case "alerts":
        setFeedAlerts([...feed_message.entity].reverse())
        break;
      case "updates":
        setFeedUpdates(feed_message.entity)
        break;
      default:
        break;
    }
    // returns the feed entities, as you may want to use them before the next update of state
    return feed_message.entity
  }


  let [trips_to_route, setTripToRoute] = useState({})

  useEffect(() => {
    async function action() {
      setTripToRoute(await getTripsToRouteID())
    }
    action()
  }, [])

  let [route, setRoute] = useState("")
  let [number, setNumber] = useState("")
  let [routes, setRoutes] = useState([])

  let [stoptimes, setStopTimes] = useState([])

  useEffect(() => {
    // needs to be like  this with an async function being called else react gives errors
    async function action() {
      setRoutes(await getRoutes())
    }
    action()
  }, [])


  let [feed_updates_filtered, setFeedUpdatesMirrored] = useReducer((state, action) => {
    let routeFilter = action.route || ""
    let numberFilter = action.number || ""
    // action.entities is given if the feed_updates has not been updated 
    let output = action.entities || feed_updates

    if (routeFilter) {
      //filter by the route
      output = output.filter((v) => {
        const trip_id = v.tripUpdate.trip.tripId
        return (trip_id in trips_to_route) && trips_to_route[trip_id] == routeFilter || !(trip_id in trips_to_route)
      }
      )
    }
    if (numberFilter) {
      // filter by train number
      const pattern = new RegExp(`^\\w*-${numberFilter}(\\d*)$`)
      output = output.filter((v) => {
        const trip_id = v.tripUpdate.trip.tripId
        return pattern.test(trip_id)
      })
    }

    // sort by timestamp descending
    return output.sort((u_1, u_2) => u_2.tripUpdate.timestamp - u_1.tripUpdate.timestamp)

  }, feed_updates)

  let updateMirroredUpdates = (entities = undefined) => { setFeedUpdatesMirrored({ "entities": entities, "route": route, "number": number }) }

  useEffect(() => {
    refreshFeeds()
  }, [])

  useEffect(() => {
    updateMirroredUpdates()
  }, [route, number])


  async function refreshFeeds() {
    set_feed("alerts")
    updateMirroredUpdates(await set_feed("updates"))
    await resetStoptimes()
  }

  async function resetStoptimes() {
    const new_stoptimes = []
    for (let feed_entity of feed_updates_filtered) {
      let trip_id = feed_entity.tripUpdate.trip.tripId
      let stoptimes = getUpdatesWithStopTimes(feed_entity.tripUpdate.stopTimeUpdate, await getStopTimesofTrip(trip_id))
      new_stoptimes.push({ "trip_id": trip_id, "stoptimes": stoptimes })

    }
    setStopTimes(new_stoptimes)
  }

  useEffect(() => {
    if (stoptimes && stoptimes.length == 0) {
      resetStoptimes()
    }
  }, [feed_type])


  async function delete_feed_entity_callback(id, type) {
    try {
      await deleteFeedEntity(id, type)
      await refreshFeeds()
    }
    catch (error) {
      alert(`Error deleting feed:\n${error.title}\n${error.message}`)
    }
  }


  return (
    <div className="container d-flex flex-column align-items-center">
      <div className='container d-flex flex-row gap-3 justify-content-center'>
        <button className='btn btn-secondary' onClick={(e) => { setFeedType("alerts") }}>⚠️ List of service alerts</button>
        <button className='btn btn-secondary' onClick={(e) => { setFeedType("updates") }}>🕛 List of trip updates</button>
        <button className='btn btn-secondary' onClick={(e) => { refreshFeeds() }}>🔄Refresh service alerts and trip updates</button>
      </div >
      {feed_type == "updates" ? <TripUpdateFilter setNumber={setNumber} number={number} route={route} setRoute={setRoute} routes={routes} /> : <></>}
      <span className='text-center fs-4'>{feed_type == "updates" ? "List of all currently active Trip Updates (Double click a row to get additional details): " : "List of all currently stored Service Alerts:"}</span>
      <table className=' border table table-hover' id="feed-table">
        <thead>
          <tr>
            {feed_type === "alerts" ?
              <><th>Active Times</th>
                <th>Entities affected</th>
                <th>Cause</th>
                <th>Effect</th>
              </> :
              <>
                <th>Trip ID</th>
                <th>Trip state</th>
                <th>Last modified</th>
              </>
            }

            <th>Edit</th>
            <th>Delete</th>
          </tr></thead>
        <tbody>
          {(feed_type == "alerts" ? feed_alerts : feed_updates_filtered).map((entity, index) => <FeedEntityRow index={index} stoptimes={stoptimes} entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />)}
        </tbody>
      </table>
    </div>
  );
}


export default function App() {
  let [cookies, setCookies, removeCookie] = useCookies()
  let [user, setUser] = useState(cookies.username || "")
  let [roles, setRoles] = useState(cookies.roles ? cookies.roles.split(",") : [])

  let logout_cookie = () => { removeCookie("username"); removeCookie("roles"); setUser("") }

  useEffect(() => {
    // fetch the csrf token asynchronously
    async function funcSetCSRF() {
      let token = await get_csrf()
      setCSRFToken(token)
    }
    funcSetCSRF()
  }, [])

  getRoutesIDToNames()

  function setUserCallback(username) {
    setUser(username)
    setCookies("username", username)
  }
  function setRolesCallback(roles) {
    setRoles(roles)
    setCookies("roles", roles.join(","))
  }
  return <BrowserRouter>
    <UserContext.Provider value={[user, setUserCallback]}>
      <RolesContext.Provider value={[roles, setRolesCallback]}>
        <div className='container d-flex flex-column align-items-center'>
          <AlertsProvider>
            <Routes>
              <Route path='/'>
                <Route index element={user ? <Main logout_cookie={logout_cookie} /> : <LoginForm />} />
                <Route path='trip_update' element={user ? <TripUpdate /> : <LoginForm />} />
                <Route path='service_alert' element={user ? <ServiceAlert /> : <LoginForm />} />
                <Route path='upload_gtfs' element={user ? <UploadsGTFS /> : <LoginForm />} />
                <Route path='add_newuser' element={user ? <AddUserForm /> : <LoginForm />} />
              </Route>
            </Routes>
          </AlertsProvider>
        </div>
      </RolesContext.Provider>
    </UserContext.Provider>
  </BrowserRouter>
}

export function Main({ logout_cookie }) {


  return <div className='d-flex flex-column align-items-center gap-3'  >
    <img src='/static/prasa-main.png' width={250} height={100} />
    <Link className='btn btn-primary' to="/upload_gtfs">Upload GTFS permanent schedules excel file </Link>
    <Link className=' btn btn-primary' to="/service_alert">Create new Service Alert</Link>
    <Link className=' btn btn-primary' to="/trip_update">Create new trip update</Link>
    <a className=' btn btn-primary' href='/static/shared/gtfs.zip'>GTFS zip for permanent schedules</a>
    <a className=' btn btn-danger' onClick={async (e) => {
      try {
        e.preventDefault()
        logout_cookie()
        await logout()
        window.location.pathname = "/"
      } catch (error) {
        if (error.title) {
          alert(`${error.title}:\n${error.message}`)
        } else {
          alert(error)
        }
      }
    }} href='/auth/logout'>Logout</a>
    <Feed />
    <img src='/static/lines.png' width={500} height={500} />
  </div>
}
