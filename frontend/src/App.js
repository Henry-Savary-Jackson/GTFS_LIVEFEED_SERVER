import { useState, useEffect } from 'react';
import { getFeedMessage, deleteFeedEntity, setCSRFToken, get_csrf } from './Utils'
import { TripUpdate } from './TripUpdate';
import { ServiceAlert } from './ServiceAlert';
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";
import {  UserContext } from './Globals';
import { LoginForm } from './Login';
import {useCookies} from 'react-cookie'
import { UploadsGTFS } from './FileUpload';

export function Feed() {
  const [feed, setFeed] = useState([])
  async function set_feed() {
    let feed_message = await getFeedMessage()
    setFeed(feed_message.entity)
  }
  useEffect(() => {
    set_feed()
  }, [])

  async function delete_feed_entity_callback(id) {
    try {
      await deleteFeedEntity(id)
      await set_feed()
    }
    catch (error) {
      console.log(error)
      alert("Error deleting feed:"+ error.message)
    }
  }


  return (
    <div className="container">
      <table className='table table-hover' id="feed-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Type</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr></thead>
        <tbody>
          {feed.map((entity) =>
            <tr key={entity.id} >
              <td>{entity.id}</td>
              <td>{entity.tripUpdate ? "TripUpdate" : "ServiceAlert"}</td>
              <td><Link to={entity.tripUpdate ? "/trip_update" : "/service_alert"} state={entity} >Edit</Link> </td>
              <td ><button className='btn btn-danger' onClick={(e) => { delete_feed_entity_callback(entity.id) }}>X</button></td>
            </tr>)}
        </tbody>
      </table>
    </div>
  );
}


export default function App() {
  let [cookies , setCookies ]= useCookies() 
  let [user, setUser] = useState(cookies.username || "")

  useEffect(() => {
    async function funcSetCSRF() {
      let token = await get_csrf()
      setCSRFToken(token)
    }
    funcSetCSRF()
  },[])

  function setUserCallback(username){
    setUser(username)
    setCookies("username", username)
  }
  return <BrowserRouter>
    <UserContext.Provider value={[user, setUserCallback]}>
      <Routes>
        <Route path='/'>
          <Route index element={user ? <Main /> : <LoginForm />} />
          <Route path='trip_update' element={user ? <TripUpdate /> : <LoginForm />} />
          <Route path='service_alert' element={user ? <ServiceAlert /> : <LoginForm />}/>
          <Route path='upload_gtfs' element={user ? <UploadsGTFS /> : <LoginForm />}/>
        </Route>
      </Routes>
    </UserContext.Provider>
  </BrowserRouter>
}

export function Main() {
  return <div className='d-flex flex-column align-items-center'  >
    <Link to="/upload_gtfs">Upload GTFS file form</Link>
    <Link to="/service_alert">Create Service Alert</Link>
    <Link to="/trip_update">Create trip update</Link>
    <a href={window.location.origin+'/static/gtfs.zip'}>GTFS zip</a>
    <a href={window.location.origin+'/auth/logout'}>Logout</a>
    <Feed />
  </div>
}
