import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import { getFeedMessage, deleteFeedEntity } from './Utils'

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
            <tr key={entity.id} id={entity.id}>
              <td>{entity.id}</td>
              <td>{entity.tripUpdate ? "TripUpdate" : "ServiceAlert"}</td>
              <td><Link to={entity.tripUpdate ? "/trip_update" : "/service_alert"} state={entity} >Edit</Link> </td>
              <td ><button className='btn' onClick={() => { delete_feed_entity_callback(entity.id) }}>X</button></td>
            </tr>)}
        </tbody>
      </table>
    </div>
  );
}



export default function Main() {
  return <div className='d-flex flex-column align-items-center'  >
    <a href="/gtfs/upload_gtfs">Upload GTFS file form</a>
    <Link to="/service_alert">Create Service Alert</Link>
    <Link to="/trip_update">Create trip update</Link>
    <a href="/static/gtfs.zip">GTFS zip</a>
    <a href="/auth/logout">Logout</a>
    <Feed />
  </div>
}
