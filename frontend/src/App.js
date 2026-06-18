import { useState, useEffect, useReducer, useContext } from 'react';
import { sendTripUpdate, getFeedMessage, logout, getHtmlForEntity, deleteFeedEntity, setCSRFToken, get_csrf, getTripsToRouteID, getRoutes, getRoutesIDToNames, getStopTimesofTrip, convertTimeStrToDate, convertTimeStrToUNIXEpoch, doActionWithAlert, getTimeSinceLastGTFS } from './Utils'
import { getUpdatesWithStopTimes, TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserContext, RolesContext, alertsContext } from './Globals';
import { transit_realtime } from "gtfs-realtime-bindings"
import { LoginForm } from './Login';
import { useCookies } from 'react-cookie'
import { UploadsGTFS } from './FileUpload';
import { TripUpdateFilter } from './Search';
import { AddUserForm, UserList } from './AddUser';
import { AlertsProvider } from './Alerts';
import { ExcelList } from './Excel';
import { Form, Table, Image, Stack, Button, ButtonGroup } from 'react-bootstrap'
import axios from 'axios';



function TripUpdateFeedEntityRow({ entity, delete_feed_entity_callback }) {

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
    <td><Link className='btn btn-primary' to="trip_update" state={entity} >Edit</Link> </td>
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
function ServiceAlertFeedEntityRow({ entity, delete_feed_entity_callback }) {

  let [show_more, set_show_more] = useState(false)
  let activePeriod = entity.alert && entity.alert.activePeriod && entity.alert.activePeriod.length > 0 ? entity.alert.activePeriod[0] : null;
  let start_date = entity.alert && activePeriod && activePeriod.start ? new Date(activePeriod.start * 1000) : null
  let end_date = entity.alert && activePeriod && activePeriod.end ? new Date(activePeriod.end * 1000) : null
  let informed_entities = entity.alert.informedEntity
  let description = (entity.alert && entity.alert.descriptionText && entity.alert.descriptionText.translation.length > 0) ? entity.alert.descriptionText.translation[0].text : ""

  let now = new Date()

  function returnTime() {
    if (!activePeriod)
      return <td>No active period</td>

    let start = start_date ? `${start_date.toDateString()} ${start_date.toLocaleTimeString()}` : "Unspecified"
    let end = end_date ? `${end_date.toDateString()} ${end_date.toLocaleTimeString()}` : "Unspecified"
    return <td width={300}><ul>
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
    <td width={600}>{description.length > 60 && !show_more ? <strong>{description.slice(0, 60)}...</strong> : <><strong>{description.slice(0, 60)}</strong>{description.slice(61)}</>} {description.length > 60 && <Button onClick={(e) => { set_show_more(!show_more) }}>{show_more ? "Show less" : "Show more"}</Button>}</td>
    <td><Link className='btn btn-primary' to="service_alert" state={entity} >Edit</Link> </td>
    <td ><DeleteFeedEntityButton entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /></td>
  </tr>
}


function FeedEntityRow({ entity, delete_feed_entity_callback }) {
  return entity.tripUpdate ? <TripUpdateFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /> : <ServiceAlertFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />
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
        setFeedAlerts([...feed_message.entity])
        break;
      case "updates":
        setFeedUpdates([...feed_message.entity])
        break;
      default:
        break;
    }
    // returns the feed entities, as you may want to use them before the next update of state
    return [...feed_message.entity]
  }


  let [popAlerts, popUpAlert] = useContext(alertsContext)
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
    return output.sort((u_1, u_2) => u_2.tripUpdate.timestamp - u_1.tripUpdate.timestamp).map((val) => { return { ...val } })

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
  }

  async function delete_feed_entity_callback(id, type) {
    try {
      await deleteFeedEntity(id, type)
      await refreshFeeds()
    }
    catch (error) {
      popUpAlert({ "message": `Error deleting feed:\n${error.title}\n${error.message}`, "type": "error" })
    }
  }


  return (
    <Stack className=' justify-content-center align-items-center' gap={3}>
      <ButtonGroup direction="horizontal"  >
        <Button variant='secondary' onClick={(e) => { setFeedType("alerts") }}>⚠️ List of service alerts</Button>
        <Button variant='secondary' onClick={(e) => { setFeedType("updates") }}>🕛 List of trip updates</Button>
        <Button variant='secondary' onClick={(e) => { refreshFeeds() }}>🔄Refresh service alerts and trip updates</Button>
      </ButtonGroup >
      {feed_type == "updates" ? <TripUpdateFilter setNumber={setNumber} number={number} route={route} setRoute={setRoute} routes={routes} /> : <></>}
      <span className='text-center fs-4'>{feed_type == "updates" ? "List of all currently active Trip Updates (Double click a row to get additional details): " : "List of all currently stored Service Alerts:"}</span>
      <Table bordered hover id="feed-table">
        <thead>
          <tr>
            {feed_type === "alerts" ?
              <><th>Active Times</th>
                <th>Scope of the alert</th>
                <th>Cause</th>
                <th>Effect</th>
                <th>Description</th>
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
          {(feed_type == "alerts" ? feed_alerts : feed_updates_filtered).map((entity, index) => <FeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />)}
        </tbody>
      </Table>
    </Stack>
  );
}


export default function App() {
  let path = axios.defaults.baseURL
  let [cookies, setCookies, removeCookie] = useCookies()
  let [user, setUser] = useState(cookies.username || "")
  let [roles, setRoles] = useState(cookies.roles ? cookies.roles.split(",") : [])

 
  let logout_cookie = () => { removeCookie("username", {path:path}); removeCookie("roles", {path:path}); setUser("") }

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
    setCookies("username", username, {path:path})
  }
  function setRolesCallback(roles) {
    setRoles(roles)
    setCookies("roles", roles.join(","), {path:path})
  }

  return <BrowserRouter basename={axios.defaults.baseURL}>
    <UserContext.Provider value={[user, setUserCallback]}>
      <RolesContext.Provider value={[roles, setRolesCallback]}>
        <AlertsProvider>
          <Routes>
            <Route path='/'>
              <Route index element={user ? <Main logout_cookie={logout_cookie} /> : <LoginForm />} />
              <Route path='trip_update' element={user ? <TripUpdate /> : <LoginForm />} />
              <Route path='service_alert' element={user ? <ServiceAlert /> : <LoginForm />} />
              <Route path='upload_gtfs' element={user && roles.includes("gtfs") ? <UploadsGTFS /> : <LoginForm />} />
              <Route path='add_user' element={user && roles.includes("admin") ? <AddUserForm /> : <LoginForm />} />
              <Route path='list_user' element={user && roles.includes("admin") ? <UserList /> : <LoginForm />} />
              <Route path='list_excel' element={user && roles.includes("excel") ? <ExcelList /> : <LoginForm />} />
            </Route>
          </Routes>
        </AlertsProvider>
      </RolesContext.Provider>
    </UserContext.Provider>
  </BrowserRouter>
}

export function Main({ logout_cookie }) {

  let [roles, setRoles] = useContext(RolesContext)

  let [time_last_sched, set_time_since_last_schedules] = useState(null)

  useEffect(() => {
    async function setTime() {
      set_time_since_last_schedules(new Date(Number(await getTimeSinceLastGTFS()) * 1000))
    }
    setTime()
  }, [])


  return <Stack gap={4} className='d-flex flex-column align-items-center justify-content-center' >
    <Image src='static/prasa-main.png' width={250} height={100} />
    {roles.includes("gtfs") && <Link className='btn btn-primary' to="upload_gtfs">Upload GTFS permanent schedules excel file </Link>}
    <Button href='gtfs/gtfs.xlsx'><Image src="static/xlsx-logo.png" width={30} height={35} />Latest Excel file </Button>
    <span>(last modified : {(time_last_sched && `${time_last_sched.toDateString()} ${time_last_sched.toLocaleTimeString()}`) || ""})</span>
    <Button href='gtfs/gtfs.zip'><Image src="static/zip-file.svg" width={30} height={35} />GTFS zip for permanent schedules</Button>
    {roles.includes("admin") && <Link className='btn btn-primary mt-2' to="list_user">Manage user access </Link>}
    {roles.includes("excel") && <Link className='btn btn-primary' to="list_excel">Manage tracking excels</Link>}
    {roles.includes("edit") && <Link className=' btn btn-primary' to="service_alert">Create new Service Alert</Link>}
    {roles.includes("edit") && <Link className=' btn btn-primary' to="trip_update">Create new trip update</Link>}
    <Button variant='danger' onClick={async (e) => {
      try {
        e.preventDefault()
        await logout()
      } catch (error) {
        if (error.title) {
          alert(`${error.title}:\n${error.message}`)
        } else {
          alert(error)
        }
      } finally {
        logout_cookie()
        window.location.pathname = "/"
      }
    }} href='/auth/logout'>Logout</Button>
    <Feed />
    <Image src='static/lines.png' width={500} height={500} />
  </Stack>
}
