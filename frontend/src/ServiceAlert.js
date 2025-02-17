import { useState, useEffect, useReducer } from 'react';
import { RouteSelect, StopSearch, TripSearch } from './Search';
import { getRoutes, convertDateToDateTimeString, getServices, getCauses, getEffects, sendServiceAlert, deleteFeedEntity, getLanguages } from './Utils';
import { useLocation } from 'react-router-dom'
import { v4 } from 'uuid'
import { transit_realtime } from "gtfs-realtime-bindings"

function convertServiceAlertDictToGTFS(dict) {
    let feedEntity = transit_realtime.FeedEntity.create()
    let alert = transit_realtime.Alert.create()

    feedEntity.id = dict.id
    feedEntity.alert = alert;
    if ('cause' in dict)
        alert.cause = dict.cause

    if ('effect' in dict)
        alert.effect = dict.effect

    if ('descriptions' in dict) {

        alert.descriptionText = transit_realtime.TranslatedString()
        alert.descriptionText.translation = dict.descriptions.map((i, val) => transit_realtime.TranslatedString.Translation.fromObject(val))
    }

    alert.informedEntity = dict.informed_entities.map((i, val) => transit_realtime.EntitySelector.fromObject(val))

    if ('period' in dict) {
        alert.active_period = new transit_realtime.TimeRange.create()
        alert.active_period.start = new Date(dict.period.start).getTime()
        alert.active_period.end = new Date(dict.period.end).getTime()
    }

    return feedEntity
}

function EntitySelectorTabs({ setInformedEntities, routes, services }) {
    let [tab, setTab] = useState("trip")

    function setRoute(route_id) {
        setInformedEntities({
            "routeId": route_id
        })
    }
    function setStop(stop_id) {
        setInformedEntities({
            "stopId": stop_id
        })
    }
    function setTripID(trip_id) {
        setInformedEntities({
            "tripId": trip_id
        })
    }

    return <div>
        <div className='container'>
            <button className='btn' onClick={(e) => { setTab("trip") }} >Trip</button>
            <button className='btn' onClick={(e) => { setTab("route") }} >Route</button>
            <button className='btn' onClick={(e) => { setTab("stop") }} >Stop</button>
        </div>
        {tab === "trip" && <TripSearch setTripID={setTripID} routes={routes} services={services} />}
        {tab === "route" && <RouteSelect setRoute={setRoute} routes={routes} />}
        {tab === "stop" && <StopSearch finish_search_callback={setStop} />}
    </div>

}


export function ServiceAlert() {
    const service_alert_inp = useLocation().state
    let id = service_alert_inp ? service_alert_inp.id : v4()
    let causes = getCauses()
    let effects = getEffects()

    let list_reducer = (state, action) => {
        if (action.action === "delete") {
            return state.filter((val, i) => i !== action.index)
        }
        return [...state, action.entity]

    }
    let [informed_entities, changeInformedEntities] = useReducer(list_reducer, service_alert_inp && service_alert_inp.alert.informedEntity ? service_alert_inp.alert.informedEntity : [])

    let [cause, setCause] = useState(service_alert_inp ? service_alert_inp.alert.cause : causes[0])
    let [effect, setEffect] = useState(service_alert_inp ? service_alert_inp.alert.effect : effects[0])



    let [descriptions, changeDescriptions] = useReducer((state, action) => {
        switch (action.action) {
            case "delete":
                return state.filter((val, i) => i !== action.index)
            case "add":
                return [...state, action.entity]
            case "modify":

                return state.map((val, i) => {
                    if (i == action.index) {
                        return { ...val, ...action.entity }
                    }
                    return val
                })
            default:
                return state;
        }
    }, service_alert_inp && service_alert_inp.alert.descriptionText ? service_alert_inp.alert.descriptionText.translation : [])

    let [start, setStart] = useState(service_alert_inp && service_alert_inp.alert.activePeriod ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].start * 1000)) : undefined)
    let [end, setEnd] = useState(service_alert_inp && service_alert_inp.alert.activePeriod ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].end * 1000)) : undefined)

    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])

    let [languages, changeLanguages] = useReducer((state, action)=>{
        switch (action.action) {
            case "delete":
                return state.filter((val, i)=> val.tag == action.tag )
            case "add":
                return [...state, action.entity ] 
            default:
                return state;
        }
    } ,getLanguages())

    let getTagNotInFeed = (descs, languages) => {
        let tags = languages.map((val, i)=> val.tag)
        let tags_used = descs.map((val, i)=> val.language)
        return tags.filter((tag)=> !(tag in tags_used))
    } 

    useEffect(() => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
        }
        setData()
    }, [])

    function addInformedEntity(entity) {
        changeInformedEntities({ "action": "save", "entity": entity })
    }


    return <div>
        <EntitySelectorTabs routes={routes} services={services} setInformedEntities={addInformedEntity} informed_entities={informed_entities} />
        {informed_entities.length > 0 && <ul className='list-group'>
            {informed_entities.map((value, i) => <li key={i}>{JSON.stringify(value)}<button className='btn' onClick={(e) => { changeInformedEntities({ "action": "delete", "index": i }) }}>X</button></li>)}
        </ul>}
        <div >
            <div className="form-group" >
                <label> Start Time</label>
                <input className='form-control' type='datetime-local' onChange={(e) => {
                    setStart(e.target.value)
                }}
                    value={start} />
            </div>
            <div className="form-group">
                <label>End Time</label>
                <input className='form-control' type='datetime-local' onChange={(e) => {
                    setEnd(e.target.value)
                }} value={end} />

            </div>
            <div className="form-group" >
                <label>Cause</label>
                <select className="form-control" value={cause} onChange={(e) => { setCause(e.target.value) }}>
                    {causes.map((val, i) => <option key={i} value={val}>{val}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Effect</label>
                <select className='form-control' value={effect} onChange={(e) => { setEffect(e.target.value) }}>
                    {effects.map((val, i) => <option key={i} value={val}>{val}</option>)}
                </select>
            </div>
            <div className="form-group" >
                <label>Description/s</label>
                <button hidden={languages.length == 0} className='btn' onClick={(e) => { 
                    changeDescriptions({ "action": "add", "entity": transit_realtime.TranslatedString.Translation.create( ) 
                    }) }}>Add Description</button>
                {descriptions.map((desc, i) => <div className='form-group'>

                    <textarea className="form-control" value={desc.text} onChange={(e) => {
                        changeDescriptions({ "action": "modify", "index": i, "entity": { "text": e.target.value } })
                    }}></textarea>
                    <select value={desc.language} onChange={(e) => changeDescriptions({ "action": "modify", "index": i, "entity": { "language": e.target.value } })}>
                        {languages.map((val, i) => <option key={i} value={val.tag}>{val.long_name}</option>)}
                    </select>

                </div>
                )}
            </div>
        </div>
        <button className="btn" onClick={async (e) => {
            let object = {
                "id": id,
                "period": { "start": Math.round(new Date(start).getTime() / 1000), "end": Math.round(new Date(end).getTime() / 1000) },
                "cause": cause,
                "effect": effect,
                "descriptions": descriptions,
                "informed_entities": informed_entities
            }
            let service_alert_gtfs = convertServiceAlertDictToGTFS(object)
            await sendServiceAlert(service_alert_gtfs)
            // save object
        }} >Save</button>
        <button className='btn' onClick={async (e) => {
            if (service_alert_inp) {
                await deleteFeedEntity(id)
            } else {
                window.location = "/"
            }

        }}> {service_alert_inp ? "Delete" : "Cancel"}</button>
    </div>


}