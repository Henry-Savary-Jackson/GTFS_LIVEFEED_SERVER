import { useState, useEffect, useReducer, useContext } from 'react';
import { getFeedMessage, deleteFeedEntity, getTripsToRouteID, getRoutes } from './Utils'
import { alertsContext } from './Globals';
import { TripUpdateFilter } from './components/search/TripSearch';
import { Table, Stack, Button, ButtonGroup } from 'react-bootstrap'

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

