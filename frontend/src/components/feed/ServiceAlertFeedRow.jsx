export default function ServiceAlertFeedEntityRow({ entity, delete_feed_entity_callback }) {

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
    <td><Link className='btn btn-primary' to="/service_alert" state={entity} >Edit</Link> </td>
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

