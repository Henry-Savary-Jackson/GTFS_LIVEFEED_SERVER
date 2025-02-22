import axios from 'axios';
import { transit_realtime } from "gtfs-realtime-bindings"

export async function getStopTimesofTrip(trip_id) {
    try {

        let response = await axios.get("/db/get_stop_times_trip", { params: { "tripid": trip_id } })
        return response.data.map((val, i) => { return { stopSequence: val[0], stopId: val[1], time: val[2] }; });

    } catch (error) {
        console.log(error)
        throw error;
    }

}

export async function getTrips(route = undefined, service = undefined, number = undefined) {
    try {
        let params = {}
        if (route)
            params.route = route
        if (service)
            params.service = service
        if (number)
            params.number = number

        let response = await axios.get("/db/get_trips", { params: { "route": route, "service": service, "number": number } })
        return response.data;

    } catch (error) {
        console.log(error)
        throw error;
    }

}
export async function getStops(stop_name) {
    try {

        let response = await axios.get("/db/get_stops", { params: { "stopname": stop_name } })
        return response.data.map((val, i) => { return { stop_id: val[0], stop_name: val[1] }; });

    } catch (error) {
        console.log(error)
        throw error;
    }


}
export async function getServices() {
    try {
        let response = await axios.get("/db/get_services")
        return response.data
    } catch (error) {
        console.log(error)
        throw error;
    }
}
export async function getRoutes() {
    try {
        let response = await axios.get("/db/get_routes")
        return response.data.map((val, i) => { return { route_id: val[0], route_long_name: val[1] }; });;


    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function getFeedMessage() {
    let response = {}
    try {
        response = await axios.get("/feed", { responseType: "arraybuffer" })
    } catch (error) {
        alert("Error fetching feed!")
        console.error(error);
        return 
    }
    try {
        console.log(response.data)
        return transit_realtime.FeedMessage.decode(new Uint8Array(response.data))
    } catch (error) {
        alert("Couldn't decode feed!")
        console.error(error);
    }
}

export async function sendTripUpdate(trip_update) {
    try {
        let result = transit_realtime.FeedEntity.verify(trip_update)
        if (result)
            throw new Error(result)

        let data = transit_realtime.FeedEntity.encode(trip_update).finish()
        console.log(data)
        console.log(transit_realtime.FeedEntity.decode(data))

        await axios.post("/feed/trip_update", data.slice().buffer, {
            withCredentials: true, headers: {
                'Content-Type': 'application/x-protobuf'
            }
        })
    } catch (error) {
        console.error(error);
    }
}
export async function sendServiceAlert(service_alert) {
    try {

        let result = transit_realtime.FeedEntity.verify(service_alert)
        if (result)
            throw new Error(result)
        let data = transit_realtime.FeedEntity.encode(service_alert).finish()
        console.log(data)
        console.log(transit_realtime.FeedEntity.decode(data))

        await axios.post("/feed/service_alert", data.slice().buffer, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/x-protobuf',
            }
        })
    } catch (error) {
        console.error(error);
    }
}
export async function deleteFeedEntity(feed_entity_id) {
    try {
        await axios.delete("/feed/delete_feed_entity", { withCredentials: true, data: feed_entity_id })
    } catch (error) {
        if (error.response) {
            alert("Couldn't delete")
            console.error(error.response.data)
        } else {
            throw error
        }
    }
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
    let str = date.toISOString()
    return str.slice(0, str.lastIndexOf(":"))
}

export async function get_csrf() {
    let response = await axios.get("/auth/csrf")
    return response.data
}

export function setCSRFToken(token) {
    axios.defaults.headers.common["X-CSRF-Token"] = token
}

export async function submitGTFS(file_data) {
    let formdata = new FormData()
    formdata.append("file", file_data)
    return await axios.postForm("/gtfs/upload_gtfs", formdata, {
        withCredentials: true,
    })
}

export async function getGTFSStatus(signal) {
    let response = await axios.get("/gtfs/status", { signal: signal, withCredentials: true })
    return response.data
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
