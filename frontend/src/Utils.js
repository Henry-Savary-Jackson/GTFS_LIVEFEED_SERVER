import axios from 'axios';
import { transit_realtime } from "gtfs-realtime-bindings"
import { useContext } from 'react';

export var routeIDstoNames = new Map()
async function performRequest(callback) {
    try {
        return await callback()
    } catch (error) {
        console.error(error)
        if (error.response) {
            let message = error.response.data
            let newError = new Error(message.description || message)
            if (message.error)
                newError.title = message.error
            throw newError
        }
        throw error
    }
}

export async function login(username, password, remember_me) {
    return await performRequest(async () => {
        return await axios.postForm("/auth/login", { "username": username, "password": password, "remember_me": remember_me }, { withCredentials: true })
    })
}

export async function add_user(username, password, roles) {
    return await performRequest(async () => {
        return await axios.postForm("/auth/add_user", { "username": username, "password": password, "roles": roles }, { withCredentials: true })
    })
}

export async function logout() {
    return await performRequest(async () => {
        return await axios.get("/auth/logout", { withCredentials: true })
    })
}

export async function getStopTimesofTrip(trip_id) {
    return await performRequest(async () => {
        let response = await axios.get("/db/get_stop_times_trip", { params: { "tripid": trip_id } })
        return response.data.map((val, i) => { return { stopSequence: Number(val[0]), stopId: val[1], time: val[2] }; });
    })
}
export function getHtmlForEntity(entity) {
    if (entity.trip || entity.tripId) {
        return <span>Trip:{entity.trip ? entity.trip.tripId : entity.tripId}</span>
    } else if (entity.routeId) {
        return <span>Route:{routeIDstoNames[entity.routeId] || entity.routeId}</span>
    } else {
        return <span>Stop:{entity.stopId}</span>
    }
}
export async function getTrips(route = undefined, service = undefined, number = undefined, after = undefined) {
    return await performRequest(async () => {
        let params = {}
        if (route)
            params.route = route
        if (service)
            params.service = service
        if (number)
            params.number = number
        if (after)
            params.after = after

        let response = await axios.get("/db/get_trips", { params: params })
        return response.data;
    })

}
export async function getStops(stop_name) {
    return await performRequest(async () => {
        let response = await axios.get("/db/get_stops", { params: { "stopname": stop_name } })
        return response.data.map((val, i) => { return { stop_id: val[0], stop_name: val[1] }; });
    })

}
export async function getServices() {
    return await performRequest(async () => {
        let response = await axios.get("/db/get_services")
        return response.data
    })
}
export async function getRoutes() {

    return await performRequest(async () => {
        let response = await axios.get("/db/get_routes")
        // console.log(response)
        return response.data
    })
}

export async function getRoutesIDToNames() {
    (await getRoutes()).forEach((route) => { routeIDstoNames[route.route_id] = route.route_long_name })
}

export async function getFeedMessage(type) {
    let response = await performRequest(async () => {
        return await axios.get(`/feed/${type}`, { responseType: "arraybuffer" })
    })

    try {
        console.log(response.data)
        return transit_realtime.FeedMessage.decode(new Uint8Array(response.data))
    } catch (error) {
        alert("Couldn't decode feed!")
        console.error(error);
    }
}

export async function sendTripUpdate(trip_update, log = true) {
    let result = transit_realtime.FeedEntity.verify(trip_update)
    if (result)
        throw new Error(result)

    let data = transit_realtime.FeedEntity.encode(trip_update).finish()

    await performRequest(async () => {
        await axios.post("/feed/trip_update", data.slice().buffer, {
            withCredentials: true, headers: {
                'Content-Type': 'application/x-protobuf',
                // add a boolean to say if it should be logged or not in the database
                'LogEntity': log

            }
        })
    })
}
export async function sendServiceAlert(service_alert, log = true) {

    let result = transit_realtime.FeedEntity.verify(service_alert)
    if (result)
        throw new Error(result)
    let data = transit_realtime.FeedEntity.encode(service_alert).finish()

    await performRequest(async () => {
        await axios.post("/feed/service_alert", data.slice().buffer, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-protobuf',
                'LogEntity': log
            }
        })
    })
}
export async function deleteFeedEntity(feed_entity_id, type, log = false) {
    await performRequest(async () => {
        await axios.delete(`/feed/${type}/delete_feed_entity`, { withCredentials: true, data: { "entity_id": feed_entity_id, "deleteFromLog": log } })
        // add some data to indicate if it should be deleted from logging or not 
    })
}

export function getCauses() {
    return [
        "UNKNOWN_CAUSE",
        "OTHER_CAUSE",
        "TECHNICAL_PROBLEM",
        "STRIKE",
        "DEMONSTRATION",
        "ACCIDENT",
        "HOLIDAY",
        "WEATHER",
        "MAINTENANCE",
        "CONSTRUCTION",
        "POLICE_ACTIVITY",
        "MEDICAL_EMERGENCY"
    ]

}

export function getEffects() {
    return [
        "NO_SERVICE",
        "REDUCED_SERVICE",
        "SIGNIFICANT_DELAYS",
        "DETOUR",
        "ADDITIONAL_SERVICE",
        "MODIFIED_SERVICE",
        "OTHER_EFFECT",
        "UNKNOWN_EFFECT",
        "STOP_MOVED",
        "NO_EFFECT",
        "ACCESSIBILITY_ISSUE"
    ]

}

export async function getTripsToRouteID() {
    return await performRequest(async () => {
        return (await axios.get("/db/trips_to_routes", {
            withCredentials: true,
        })).data
    })
}

export function convertTimeStrToDate(time_str) {
    let [hours, minutes, seconds] = time_str.split(':')
    let time = new Date()
    time.setHours(hours)
    time.setMinutes(minutes)
    time.setSeconds(seconds)
    return time
}

export function convertTimeStrToUNIXEpoch(time_str) {
    return Math.round(convertTimeStrToDate(time_str).valueOf() / 1000)
}

export function convertDateToDateTimeString(date) {
    return date.toLocaleString("sv", { offset: date.getTimezoneOffset() }).replace(" ", "T")
}
export function convertDateToTimeString(date) {

    return date.toLocaleTimeString("sv", { offset: date.getTimezoneOffset() }) // this is a nice hack to get a ISO format datetime with timezone offset
    // here is the link https://stackoverflow.com/questions/12413243/javascript-date-format-like-iso-but-local
}

export async function get_csrf() {
    let response = await axios.get("/auth/csrf")
    return response.data
}

export function setCSRFToken(token) {
    axios.defaults.headers.common["X-CSRF-Token"] = token
}

export async function submitGTFS(file_data) {
    await performRequest(async () => {
        let formdata = new FormData()
        formdata.append("file", file_data)
        return await axios.postForm("/gtfs/upload_gtfs", formdata, {
            withCredentials: true,
        })
    })
}

export async function getGTFSStatus(signal) {
    return await performRequest(async () => {
        let response = await axios.get("/gtfs/status", { signal: signal, withCredentials: true })
        return response.data
    })
}

export async function doActionWithAlert(action, success_message,  popUpAlert, onException) {
    try {
        await action()
        if (success_message)
            popUpAlert({ "message": success_message, "type": "success" })
    } catch (error) {
        if (onException)
            onException(error)
        if (error.title) {
            popUpAlert({ "message": `${error.title}:\n${error.message}`, "type": "error" })
        } else {
            popUpAlert({ "message": `${error}`, "type": "error" })
        }
    }
}



export var createLangObject = (long_name, tag) => { return { "long_name": long_name, "tag": tag } }
export var system_languages = [
    createLangObject("English", "en-ZA"),
    createLangObject("Afrikaans", "af-ZA"),
    createLangObject("isiXhosa", "xh-ZA"),
    createLangObject("isiZulu", "zu-ZA"),
    createLangObject("isiNdebele", "nd"),
    createLangObject("Sotho", "st"),
    createLangObject("Tsonga", "ts"),
    createLangObject("Tswana", "tn"),
    createLangObject("Venda", "ve")]
