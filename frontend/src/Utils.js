import axios, { AxiosError } from 'axios';
import { transit_realtime } from "gtfs-realtime-bindings"

async function performRequest(callback) {
    try {
        return await callback()
    } catch (error) {
        console.error(error)
        if (error.response)
            error.message = error.response.data
        throw error
    }
}

export async function getStopTimesofTrip(trip_id) {
    return await performRequest(async () => {
        let response = await axios.get("/db/get_stop_times_trip", { params: { "tripid": trip_id } })
        return response.data.map((val, i) => { return { stopSequence: val[0], stopId: val[1], time: val[2] }; });
    })
}
export function getHtmlForEntity(entity) {
    if (entity.trip || entity.tripId) {
        return <span>Trip:{entity.trip ? entity.trip.tripId : entity.tripId}</span>
    } else if (entity.routeId) {
        return <span>Route:{entity.routeId}</span>
    } else {
        return <span>Stop:{entity.stopId}</span>
    }
}
export async function getTrips(route = undefined, service = undefined, number = undefined) {
    return await performRequest(async () => {
        let params = {}
        if (route)
            params.route = route
        if (service)
            params.service = service
        if (number)
            params.number = number

        let response = await axios.get("/db/get_trips", { params: { "route": route, "service": service, "number": number } })
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
        return response.data.map((val, i) => { return { route_id: val[0], route_long_name: val[1] }; });;
    })
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

export async function sendTripUpdate(trip_update) {
    let result = transit_realtime.FeedEntity.verify(trip_update)
    if (result)
        throw new Error(result)

    let data = transit_realtime.FeedEntity.encode(trip_update).finish()

    await performRequest(async () => {
        await axios.post("/feed/trip_update", data.slice().buffer, {
            withCredentials: true, headers: {
                'Content-Type': 'application/x-protobuf'
            }
        })
    })
}
export async function sendServiceAlert(service_alert) {
    let result = transit_realtime.FeedEntity.verify(service_alert)
    if (result)
        throw new Error(result)
    let data = transit_realtime.FeedEntity.encode(service_alert).finish()

    await performRequest(async () => {
        await axios.post("/feed/service_alert", data.slice().buffer, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-protobuf',
            }
        })
    })
}
export async function deleteFeedEntity(feed_entity_id) {
    await performRequest(async () => {
        await axios.delete("/feed/delete_feed_entity", { withCredentials: true, data: feed_entity_id })
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

export function convertDateToDateTimeString(date) {
    return date.toLocaleString("sv", {offset:date.getTimezoneOffset()}).replace(" ", "T")
}
export function convertDateToTimeString(date){

    return date.toLocaleTimeString("sv", {offset:date.getTimezoneOffset()}) // this is a nice hack to get a ISO format datetime with timezone offset
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
