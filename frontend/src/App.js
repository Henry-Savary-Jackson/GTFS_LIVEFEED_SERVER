import { useState, useEffect } from 'react';
import { getFeedMessage, getHtmlForEntity, deleteFeedEntity, setCSRFToken, get_csrf } from './Utils'
import { TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import { UserContext } from './Globals';
import { LoginForm } from './Login';
import { useCookies } from 'react-cookie'
import { UploadsGTFS } from './FileUpload';
import { logout } from './Auth';

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
      <td>Service Alert</td>
      <td><Link to="/service_alert" state={entity} >Edit</Link> </td>
    </>
  }
  function renderTripUpdate() {
    return <>
      <td >{entity.tripUpdate.trip ? entity.tripUpdate.trip.tripId : ""}</td>
      <td>Trip Update</td>
      <td><Link to="/trip_update" state={entity} >Edit</Link> </td>
    </>
  }

  return <tr key={entity.id} >
    <td>{entity.id}</td>
    {entity.tripUpdate ? renderTripUpdate() : renderServiceAlert()}
    <td ><button className='btn btn-danger' onClick={(e) => {
      if (window.confirm("Are you sure you want to delete")) {
        delete_feed_entity_callback(entity.id)
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

  }
  useEffect(() => {
    refreshFeeds()
  }, [])

  function refreshFeeds() {
    set_feed("alerts")
    set_feed("updates")
  }

  async function delete_feed_entity_callback(id) {
    try {
      await deleteFeedEntity(id)
      await set_feed()
    }
    catch (error) {
      alert("Error deleting feed:" + error.message)
    }
  }


  return (
    <div className="container d-flex flex-column align-items-center">
      <div className='container'>
        <button className='btn' onClick={(e) => { setFeedType("alerts") }}>Alerts</button>
        <button className='btn' onClick={(e) => { setFeedType("updates") }}>Trip Updates</button>
        <button className='btn' onClick={(e) => { refreshFeeds() }}>Refresh</button>
      </div>
      <table className='table table-hover' id="feed-table">
        <thead>
          <tr>
            <th>Id</th>
            {feed_type === "alerts" ?
              <><th>Active Times</th>
                <th>Entities</th></> :
              <>
                <th>Trip ID</th>
              </>
            }

            <th>Type</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr></thead>
        <tbody>
          {(feed_type == "alerts" ? feed_alerts : feed_updates).map((entity) => <FeedEntityRow entity={entity} delete_feed_entity_callback={delete_feed_entity_callback} />)}
        </tbody>
      </table>
    </div>
  );
}


export default function App() {
  let [cookies, setCookies, removeCookie] = useCookies()
  let [user, setUser] = useState(cookies.username || "")

  let logout_cookie = () => { removeCookie("username"); setUser("") }

  useEffect(() => {
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
  return <BrowserRouter>
    <UserContext.Provider value={[user, setUserCallback]}>
      <Routes>
        <Route path='/'>
          <Route index element={user ? <Main logout_cookie={logout_cookie} /> : <LoginForm />} />
          <Route path='trip_update' element={user ? <TripUpdate /> : <LoginForm />} />
          <Route path='service_alert' element={user ? <ServiceAlert /> : <LoginForm />} />
          <Route path='upload_gtfs' element={user ? <UploadsGTFS /> : <LoginForm />} />
        </Route>
      </Routes>
    </UserContext.Provider>
  </BrowserRouter>
}

export function Main({ logout_cookie }) {
  return <div className='d-flex flex-column align-items-center gap-3'  >
    <img src='/static/prasa-main.png' width={250} height={100} />
    <Link to="/upload_gtfs">Upload GTFS file form</Link>
    <Link to="/service_alert">Create Service Alert</Link>
    <Link to="/trip_update">Create trip update</Link>
    <a href='/static/shared/gtfs.zip'>GTFS zip</a>
    <a onClick={async (e) => {
      try {
        e.preventDefault()
        logout_cookie()
        await logout()
        window.location.reload()
      } catch (error) {
        alert(error)
      }
    }} href='/auth/logout'>Logout</a>
    <Feed />
    <img src='/static/lines.png' width={500} height={500} />
  </div>
}
