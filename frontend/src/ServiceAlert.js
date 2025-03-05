import { useState, useEffect, useReducer, useContext } from 'react';
import { RouteSelect, StopSearch, TripSearch } from './Search';
import { getHtmlForEntity, getRoutes, convertDateToDateTimeString, getServices, getCauses, getEffects, sendServiceAlert, system_languages } from './Utils';
import { useLocation } from 'react-router-dom'
import { v4 } from 'uuid'
import { transit_realtime } from "gtfs-realtime-bindings"

function convertServiceAlertDictToGTFS(dict) {
    let feedEntity = transit_realtime.FeedEntity.create()
    let alert = transit_realtime.Alert.create()

    feedEntity.id = dict.id
    feedEntity.alert = alert;
    if ('cause' in dict)
        alert.cause = transit_realtime.Alert.Cause[dict.cause]

    if ('effect' in dict)
        alert.effect = transit_realtime.Alert.Effect[dict.effect]

    if ('descriptions' in dict) {
        alert.descriptionText = transit_realtime.TranslatedString.create()
        alert.descriptionText.translation = dict.descriptions.map((val, i) => transit_realtime.TranslatedString.Translation.fromObject(val))
    }

    alert.informedEntity = dict.informed_entities.map((val, i) => {
        let out = { ...val }
        if ("tripId" in out)
            out.trip = { "tripId": out.tripId }
        return transit_realtime.EntitySelector.fromObject(out)
    })

    if ('period' in dict && (dict.period.start || dict.period.end)) {
        let timerange = new transit_realtime.TimeRange.create()
        if (dict.period.start)
            timerange.start = Math.round(new Date(dict.period.start).valueOf() / 1000)
        if (dict.period.end)
            timerange.end = Math.round(new Date(dict.period.end).valueOf() / 1000)
        alert.activePeriod = [timerange]
    }

    return feedEntity
}

function EntitySelectorTabs({ setInformedEntities }) {
    let [tab, setTab] = useState("trip")
    let [routeSelect, setRouteSelect] = useState("")
    let [routes, setRoutes] = useState([])
    let [services, setServices] = useState([])
    useEffect(() => {
        async function setData() {
            setRoutes(await getRoutes())
            setServices(await getServices())
        }
        setData()
    }, [])

    function setRouteInformedEntity(route_id) {
        setRouteSelect(route_id)
        if (!route_id)
            return
        setInformedEntities({
            "routeId": route_id
        })
    }
    function setStopInformedEntity(stop_id) {
        if (!stop_id)
            return
        setInformedEntities({
            "stopId": stop_id
        })
    }
    function setTripIDInformedEntity(trip_id) {
        if (!trip_id)
            return
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
        {tab === "trip" && <TripSearch setTripID={setTripIDInformedEntity} routes={routes} services={services} />}
        {tab === "route" && <RouteSelect setRoute={setRouteInformedEntity} routes={routes} route={routeSelect} />}
        {tab === "stop" && <StopSearch finish_search_callback={setStopInformedEntity} />}
    </div>

}

function InformedEntities({ entities, changeInformedEntities }) {

    return <ul className='list-group'>{entities.map((entity, index) => <li key={index}>{getHtmlForEntity(entity)}<button className='btn btn-danger' onClick={(e) => { changeInformedEntities({ "action": "delete", "index": index }) }}>X</button></li>)}</ul>
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

    let [cause, setCause] = useState(service_alert_inp ? transit_realtime.Alert.Cause[service_alert_inp.alert.cause] : causes[0])
    let [effect, setEffect] = useState(service_alert_inp ? transit_realtime.Alert.Effect[service_alert_inp.alert.effect] : effects[0])


    let [descriptions, changeDescriptions] = useReducer((state, action) => {
        switch (action.action) {
            case "delete":
                return state.filter((val, i) => i !== action.index)
            case "add":
                return [...state, action.entity]
            case "modify":

                return state.map((val, i) => {
                    if (i === action.index) {
                        return { ...val, ...action.entity }
                    }
                    return val
                })
            default:
                return state;
        }
    }, service_alert_inp && service_alert_inp.alert.descriptionText ? service_alert_inp.alert.descriptionText.translation : [])

    let [start, setStart] = useState(service_alert_inp && service_alert_inp.alert.activePeriod.length > 0 && service_alert_inp.alert.activePeriod[0].start ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].start * 1000)) : '')
    let [end, setEnd] = useState(service_alert_inp && service_alert_inp.alert.activePeriod.length > 0 && service_alert_inp.alert.activePeriod[0].end ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].end * 1000)) : '')



    function addInformedEntity(entity) {
        changeInformedEntities({ "action": "save", "entity": entity })
    }


    return <div className="d-flex flex-column align-items-center gap-5">
        <EntitySelectorTabs setInformedEntities={addInformedEntity} />
        {informed_entities.length > 0 && <InformedEntities entities={informed_entities} changeInformedEntities={changeInformedEntities} />}
        <div className='d-flex flex-column align-items-center gap-3' >
            <div className="form-group" >
                <label htmlFor='input-start'> Start Time</label>
                <input id="input-start" className='form-control' type='datetime-local' onBlur={(e) => { setStart(e.target.value) }} onInput={(e) => {
                    setStart(e.target.value)
                }}
                    value={start} />
            </div>
            <div className="form-group">
                <label htmlFor='input-end'>End Time</label>
                <input id="input-end" className='form-control' type='datetime-local' onBlur={(e) => { setEnd(e.target.value) }} onInput={(e) => {
                    setEnd(e.target.value)
                }} value={end} />

            </div>
            <div className="form-group" >
                <label htmlFor='cause-select' >Cause</label>
                <select id="cause-select" className="form-control" value={cause} onChange={(e) => { setCause(e.target.value) }}>
                    {causes.map((val, i) => <option key={i} value={val}>{val}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor='effect-select'>Effect</label>
                <select id="effect-select" className='form-control' value={effect} onChange={(e) => { setEffect(e.target.value) }}>
                    {effects.map((val, i) => <option key={i} value={val}>{val}</option>)}
                </select>
            </div>
            <div className="form-group" >
                <div className='form-group'>
                    <label htmlFor='addDescButton'>Description/s</label>
                    <button hidden={system_languages.length === 0} className='btn btn-primary' onClick={(e) => {
                        changeDescriptions({ "action": "add", "entity": transit_realtime.TranslatedString.Translation.create({ language: system_languages[0].tag }) })
                    }} id='addDescButton'>Add Description</button>
                </div>
                <div className=' d-flex flex-column align-items-center gap-3'>
                    {descriptions.map((desc, i) => <div key={i} className='form-group'>
                        <textarea className="form-control" value={desc.text} onChange={(e) => {
                            changeDescriptions({ "action": "modify", "index": i, "entity": { "text": e.target.value } })
                        }}></textarea>
                        <select className='form-control' value={desc.language} onChange={(e) => changeDescriptions({ "action": "modify", "index": i, "entity": { "language": e.target.value } })}>
                            {system_languages.map((val, i) => <option key={i} value={val.tag}>{val.long_name}</option>)}
                        </select>
                        <button className='btn btn-danger' onClick={(e) => {
                            changeDescriptions({ "action": "delete", "index": i })
                        }} >X</button>
                    </div>
                    )}

                </div>
            </div>
        </div>
        <button className="btn btn-success " onClick={async (e) => {
            try {
                let object = {
                    "id": id,
                    "period": { "start": Math.round(new Date(start).valueOf()), "end": Math.round(new Date(end).valueOf()) },
                    "cause": cause,
                    "effect": effect,
                    "descriptions": descriptions,
                    "informed_entities": informed_entities
                }
                let service_alert_gtfs = convertServiceAlertDictToGTFS(object)
                await sendServiceAlert(service_alert_gtfs)
                alert("Successfully saved Alert!")
            } catch (error) {
                alert(error.message || error)
            }
            // save object
        }} >Save</button>
        <button className='btn btn-danger' onClick={(e) => {
            if (window.confirm("Are you sure you want to cancel? You might lose unsaved changes"))
                window.location = "/"

        }}>Cancel</button>
    </div>


}