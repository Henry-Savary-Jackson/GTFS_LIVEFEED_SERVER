import { useState, useEffect, useReducer, useRef } from 'react';
import { getFeedMessage, logout, getHtmlForEntity, deleteFeedEntity, setCSRFToken, get_csrf, getTripsToRouteID, getRoutes, getRoutesIDToNames, getStopTimesofTrip, convertTimeStrToDate, convertTimeStrToUNIXEpoch } from './Utils'
import { TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserContext, RolesContext } from './Globals';
import { transit_realtime } from "gtfs-realtime-bindings"
import { LoginForm } from './Login';
import { useCookies } from 'react-cookie'
import { UploadsGTFS } from './FileUpload';
import { TripUpdateFilter } from './Search';
import { AddUserForm } from './AddUser';
import { AlertsProvider } from './Alerts';



function TripUpdateFeedEntityRow({ index, stoptimes = undefined, entity, delete_feed_entity_callback }) {

  const stop_times_at_index = stoptimes && stoptimes.length > 0 ? stoptimes[index].stoptimes : null
  let first = stop_times_at_index ? convertTimeStrToDate(stop_times_at_index[0].time) : null
  let last = stop_times_at_index ? convertTimeStrToDate(stop_times_at_index[stop_times_at_index.length - 1].time) : null
  console.log(first, last)
  let modified_datetime = entity.tripUpdate.timestamp ? new Date(entity.tripUpdate.timestamp * 1000) : undefined
  let modified = modified_datetime ? `${modified_datetime.toDateString()} ${modified_datetime.toLocaleTimeString()}` : ``
  let now = new Date()
  let css_class = ""
  let state = ""

  if (first && last) {
    if (first >= now) {
      css_class = "table-warning"
      state = "Trip yet to start"
    } else if (last > now && first < now) {
      css_class = "table-success"
      state = "Trip in progress"
    } else if (last > now && first < now) {
    } else if (last <= now) {
      css_class = "table-danger"
      state = "Trip finished"
    }
  }

  return <tr className={css_class} key={entity.id} >
    <td >{entity.tripUpdate.trip.tripId}</td>
    <td >{state}</td>
    <td>{modified}</td>
    <td><Link className='btn btn-primary' to="/trip_update" state={entity} >Edit</Link> </td>
    <td ><DeleteFeedEntityButton  entity={entity} delete_feed_entity_callback={delete_feed_entity_callback}/></td>
  </tr>
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
    <td>{transit_realtime.Alert.Effect[entity.alert.cause]}</td>
    <td><Link className='btn btn-primary' to="/service_alert" state={entity} >Edit</Link> </td>
    <td ><DeleteFeedEntityButton  entity={entity} delete_feed_entity_callback={delete_feed_entity_callback}/></td>
  </tr>
}


function FeedEntityRow({ index, stoptimes = undefined, entity, delete_feed_entity_callback }) {
  return entity.tripUpdate ? <TripUpdateFeedEntityRow index={index} stoptimes={stoptimes} entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} /> : <ServiceAlertFeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />
}

function DeleteFeedEntityButton({ entity, delete_feed_entity_callback }) {
  return (<button className='btn btn-danger' onClick={(e) => {
    if (window.confirm("Are you sure you want to delete")) {
      // let deleteFromLog = window.confirm("Do you want to delete this entity from the log?")
      let deleteFromLog = true
      delete_feed_entity_callback(entity.id, entity.tripUpdate ? "updates" : "alerts", deleteFromLog)
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
    resetStoptimes()
  }

  async function resetStoptimes(){
      const new_stoptimes = []
      for (let feed_entity of feed_updates_filtered) {
        let trip_id = feed_entity.tripUpdate.trip.tripId
        new_stoptimes.push({ "trip_id": trip_id, "stoptimes": await getStopTimesofTrip(trip_id) })
      }
      setStopTimes(new_stoptimes)
  }

  useEffect(() => {
    if (stoptimes && stoptimes.length == 0) {
      resetStoptimes()
   }
  }, [feed_type, stoptimes])


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
      <span className='text-center fs-4'>{feed_type == "updates" ? "List of all currently active Trip Updates: " : "List of all currently stored Service Alerts:"}</span>
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
    <Link className='btn btn-primary' to="/upload_gtfs">Upload GTFS file form</Link>
    <Link className=' btn btn-primary' to="/service_alert">Create Service Alert</Link>
    <Link className=' btn btn-primary' to="/trip_update">Create trip update</Link>
    <a className=' btn btn-primary' href='/static/shared/gtfs.zip'>GTFS zip</a>
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
