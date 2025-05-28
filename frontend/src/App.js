import { useState, useEffect, useReducer, useRef } from 'react';
import { getFeedMessage, logout, getHtmlForEntity, deleteFeedEntity, setCSRFToken, get_csrf, getTripsToRouteID, getRoutes } from './Utils'
import { TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserContext , RolesContext} from './Globals';
import { LoginForm } from './Login';
import { useCookies } from 'react-cookie'
import { UploadsGTFS } from './FileUpload';
import { TripUpdateFilter } from './Search';
import { AddUserForm } from './AddUser';

function FeedEntityRow({ entity, delete_feed_entity_callback }) {


  function renderServiceAlert() {
    let informed_entities = entity.alert.informedEntity
    function returnTime() {
      let activePeriod = entity.alert.activePeriod
      if (!activePeriod || activePeriod.length == 0)
        return <td>No active period</td>

      let start_date = new Date(activePeriod[0].start * 1000)
      let end_date = new Date(activePeriod[0].end * 1000)
      let start = activePeriod[0].start ? `${start_date.toDateString()} ${start_date.toLocaleTimeString()}` : "Unspecified"
      let end = activePeriod[0].end ? `${end_date.toDateString()} ${end_date.toLocaleTimeString()}` : "Unspecified"
      return <td><ul>
        <li>Start:{start}</li>
        <li>End:{end}</li>
      </ul>
      </td>
    }
    return <>
      {returnTime()}
      <td><ul>{informed_entities.map((entity, i) => <li key={i}>{getHtmlForEntity(entity)}</li>)}</ul></td>
      <td><Link to="/service_alert" state={entity} >Edit</Link> </td>
    </>
  }
  function renderTripUpdate() {
    let modified_datetime = entity.tripUpdate.timestamp ? new Date(entity.tripUpdate.timestamp * 1000) : undefined
    let modified = modified_datetime ? `${modified_datetime.toDateString()} ${modified_datetime.toLocaleTimeString()}` : ``
    return <>
      <td >{entity.tripUpdate.trip ? entity.tripUpdate.trip.tripId : ""}</td>
      <td>{modified}</td>
      <td><Link to="/trip_update" state={entity} >Edit</Link> </td>
    </>
  }

  return <tr key={entity.id} >
    <td>{entity.id}</td>
    {entity.tripUpdate ? renderTripUpdate() : renderServiceAlert()}
    <td ><button className='btn btn-danger' onClick={(e) => {
      if (window.confirm("Are you sure you want to delete")) {
        let deleteFromLog = window.confirm("Do you want to delete this entity from the log?")
        delete_feed_entity_callback(entity.id, entity.tripUpdate ? "updates" : "alerts", deleteFromLog)
      }
    }
    }>X</button></td>
  </tr>
}

export function Feed() {
  const [feed_alerts, setFeedAlerts] = useState([])
  const [feed_type, setFeedType] = useState("alerts")
  const [feed_updates, setFeedUpdates] = useState([])
  async function set_feed(type) {
    let feed_message = await getFeedMessage(type)
    switch (type) {
      case "alerts":
        setFeedAlerts(feed_message.entity)
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
      const pattern = new RegExp(`^\\w*-${numberFilter}(\\d*)$`) // TODO: FIX THIS
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
  }

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
      <div className='container'>
        <button className='btn' onClick={(e) => { setFeedType("alerts") }}>Alerts</button>
        <button className='btn' onClick={(e) => { setFeedType("updates") }}>Trip Updates</button>
        <button className='btn' onClick={(e) => { refreshFeeds() }}>Refresh</button>
      </div >
      {feed_type == "updates" ? <TripUpdateFilter setNumber={setNumber} number={number} route={route} setRoute={setRoute} routes={routes} /> : <></>}
      <table className='table table-hover' id="feed-table">
        <thead>
          <tr>
            <th>Id</th>
            {feed_type === "alerts" ?
              <><th>Active Times</th>
                <th>Entities</th></> :
              <>
                <th>Trip ID</th>
                <th>Last modified</th>
              </>
            }

            <th>Edit</th>
            <th>Delete</th>
          </tr></thead>
        <tbody>
          {(feed_type == "alerts" ? feed_alerts : feed_updates_filtered).map((entity) => <FeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />)}
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

  function setUserCallback(username) {
    setUser(username)
    setCookies("username", username)
  }
  function setRolesCallback(roles){
    setRoles(roles)
    setCookies("roles", roles.join(","))
  }
  return <BrowserRouter>
    <UserContext.Provider value={[user, setUserCallback]}>
      <RolesContext.Provider value={[roles, setRolesCallback]}>
      <Routes>
        <Route path='/'>
          <Route index element={user ? <Main logout_cookie={logout_cookie} /> : <LoginForm />} />
          <Route path='trip_update' element={user ? <TripUpdate /> : <LoginForm />} />
          <Route path='service_alert' element={user ? <ServiceAlert /> : <LoginForm />} />
          <Route path='upload_gtfs' element={user ? <UploadsGTFS /> : <LoginForm />} />
          <Route path='add_newuser' element={user ? <AddUserForm /> : <LoginForm />} />
        </Route>
      </Routes>
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
