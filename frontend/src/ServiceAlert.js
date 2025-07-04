import { useContext, useState, useEffect, useReducer } from 'react';
import { RouteSelect, StopSearch, TripSearch } from './Search';
import { getHtmlForEntity, getRoutes, convertDateToDateTimeString, getServices, getCauses, getEffects, sendServiceAlert, system_languages, doActionWithAlert } from './Utils';
import { Link, useLocation } from 'react-router-dom'
import { v4 } from 'uuid'
import { transit_realtime } from "gtfs-realtime-bindings"
import { alertsContext } from './Globals';
function convertServiceAlertDictToGTFS(dict) {
    let feedEntity = transit_realtime.FeedEntity.create()
    let alert = transit_realtime.Alert.create()

    feedEntity.id = dict.id
    feedEntity.alert = alert;
    if ('cause' in dict)
        alert.cause = transit_realtime.Alert.Cause[dict.cause]

    if ('effect' in dict)
        alert.effect = transit_realtime.Alert.Effect[dict.effect]

    if ('descriptions' in dict && dict.descriptions.length > 0) {
        alert.descriptionText = transit_realtime.TranslatedString.create()
        alert.descriptionText.translation = dict.descriptions.map((val, i) => transit_realtime.TranslatedString.Translation.fromObject(val))
    }

    if ("url" in dict && dict.url) {
        const pattern = /^http(s?):\/\/(\w+?\.){1,}(\w+?)$/
        if (pattern.test(dict.url)) {
            alert.url = transit_realtime.TranslatedString.fromObject({ "translation": [{ "language": "en-ZA", "text": dict.url }] })
        }
        else {
            throw new Error("Alert URL is invalid")
        }
    }

    alert.informedEntity = dict.informed_entities.map((val, i) => {
        let out = { ...val }
        if ("tripId" in out)
            out.trip = { "tripId": out.tripId }
        return transit_realtime.EntitySelector.fromObject(out)
    })

    if ('period' in dict && dict.period && (dict.period.start || dict.period.end)) {
        let timerange = new transit_realtime.TimeRange.create()
        if (dict.period.start)
            timerange.start = Math.round(dict.period.start / 1000)
        if (dict.period.end)
            timerange.end = Math.round(dict.period.end / 1000)
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

    return <div className='container rounded border p-4'>
        <div className='container d-flex flex-row justify-content-center gap-2'>
            <span>Select an alert affecting a:</span>
            <button className='btn btn-primary' onClick={(e) => { setTab("trip") }} >Trip</button>
            <button className='btn btn-primary' onClick={(e) => { setTab("route") }} >Route</button>
            <button className='btn btn-primary' onClick={(e) => { setTab("stop") }} >Stop</button>
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
    const location = useLocation()
    const service_alert_inp = location.state
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
    }, service_alert_inp && service_alert_inp.alert.descriptionText ? service_alert_inp.alert.descriptionText.translation : [{ "language": system_languages[0].tag, "text": "" }])


    let start_date_obj = service_alert_inp && service_alert_inp.alert.activePeriod.length > 0 && service_alert_inp.alert.activePeriod[0].start ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].start * 1000)) : null;
    let end_date_obj = service_alert_inp && service_alert_inp.alert.activePeriod.length > 0 && service_alert_inp.alert.activePeriod[0].start ? convertDateToDateTimeString(new Date(service_alert_inp.alert.activePeriod[0].end * 1000)) : null;
    let [startDate, setStartDate] = useState(start_date_obj ? start_date_obj.slice(0, start_date_obj.indexOf("T")) : "")
    let [endDate, setEndDate] = useState(end_date_obj ? end_date_obj.slice(0, end_date_obj.indexOf("T")) : "")

    let [startTime, setStartTime] = useState(start_date_obj ? start_date_obj.slice(start_date_obj.indexOf("T") + 1, start_date_obj.lastIndexOf(":")) : "")
    let [endTime, setEndTime] = useState(end_date_obj ? end_date_obj.slice(end_date_obj.indexOf("T") + 1, end_date_obj.lastIndexOf(":")) : "")

    let [url, setURL] = useState((service_alert_inp && service_alert_inp.alert.url && service_alert_inp.alert.url.translation[0].text) || "")

    function addInformedEntity(entity) {
        changeInformedEntities({ "action": "save", "entity": entity })
    }

    let [alerts, popUpAlert] = useContext(alertsContext)

    return <div className='container flex-column d-flex align-items-center gap-5' >
        <div className="d-flex flex-column align-items-center gap-5">
            <div className=' d-flex flex-column gap-3 position-fixed top-50 start-0'>
                <Link className='btn btn-primary' to="/">⬅️ Go back to main page</Link>
                <button onClick={(e) => { window.location.reload() }} className='btn btn-primary' to="/">Create a new service alert</button>
            </div>
            <EntitySelectorTabs setInformedEntities={addInformedEntity} />
            {informed_entities.length > 0 && <InformedEntities entities={informed_entities} changeInformedEntities={changeInformedEntities} />}
            <div className='d-flex flex-column align-items-center w-100 gap-3' >
                <div className="form-group w-100 d-flex flex-row gap-2" >
                    <label htmlFor='input-start'> Start Time</label>
                    <input id="input-start" className='form-control' type='date' onInput={(e) => {
                        setStartDate(e.target.value)
                    }}
                        value={startDate} />
                    <input id="input-end-time" className='form-control' type='time' value={startTime} onInput={(e) => { setStartTime(e.target.value) }} />
                </div>
                <div className="form-group w-100 d-flex flex-row gap-2">
                    <label htmlFor='input-end-date'>End Time</label>
                    <input id="input-end-date" className='form-control' type='date' onInput={(e) => {
                        setEndDate(e.target.value)
                    }} value={endDate} />
                    <input id="input-end-time" className='form-control' type='time' value={endTime} onInput={(e) => { setEndTime(e.target.value) }} />

                </div>
                <div className="form-group w-100" >
                    <label htmlFor='cause-select' >Cause</label>
                    <select id="cause-select" className="form-control w-100" value={cause} onChange={(e) => { setCause(e.target.value) }}>
                        {causes.map((val, i) => <option key={i} value={val}>{val}</option>)}
                    </select>
                </div>
                <div className="form-group w-100 ">
                    <label htmlFor='effect-select'>Effect</label>
                    <select id="effect-select" className='form-control w-100' value={effect} onChange={(e) => { setEffect(e.target.value) }}>
                        {effects.map((val, i) => <option key={i} value={val}>{val}</option>)}
                    </select>
                </div>

                <div className="form-group d-flex flex-column gap-3 m-3 w-100" >
                    <div className='form-group w-100 d-flex flex-row gap-3 align-items-center justify-content-center'>
                        <label htmlFor='addDescButton'>Description/s</label>
                        <button hidden={system_languages.length === 0} className='btn btn-primary' onClick={(e) => {
                            changeDescriptions({ "action": "add", "entity": transit_realtime.TranslatedString.Translation.create({ language: system_languages[0].tag }) })
                        }} id='addDescButton'>Add Description</button>
                    </div>
                    <div className='container w-100 d-flex flex-column align-items-center gap-3'>
                        {descriptions.map((desc, i) => <div key={i} className='d-flex w-100 flex-column align-items-left gap-1 form-group'>
                            <textarea style={{ "minHeight": "18rem" }} className="w-100 form-control" value={desc.text} onChange={(e) => {
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
                <div className="form-group w-100">
                    <label htmlFor='url-input'>URL</label>
                    <input className='form-control w-100' id='url-input' value={url} onChange={(e) => { setURL(e.target.value) }} />
                </div>
            </div>
            <button className="btn btn-success " onClick={async (e) => {
                await doActionWithAlert(async () => {
                    let start = startDate ? new Date(startDate + (startTime ? `T${startTime}` : "")).valueOf() : undefined;
                    let end = endDate ? new Date(endDate + (endTime ? `T${endTime}` : "")).valueOf() : undefined;
                    let period = startDate || endDate ? { "start": start, "end": end } : undefined;
                    // combine date and time strings into date and then into unix time
                    const object = {
                        "id": id,
                        "period": period,
                        "cause": cause,
                        "effect": effect,
                        "descriptions": descriptions,
                        "informed_entities": informed_entities,
                        "url": url
                    }
                    const service_alert_gtfs = convertServiceAlertDictToGTFS(object)
                    await sendServiceAlert(service_alert_gtfs)
                    location.state = service_alert_gtfs

                }, " ✅ Successfully saved Alert!", popUpAlert)
                // save object
            }} >Save</button>
            <button className='btn btn-danger' onClick={(e) => {
                if (window.confirm("Are you sure you want to cancel? You might lose unsaved changes"))
                    window.location = "/"

            }}>Cancel</button>
        </div>
    </div>

}