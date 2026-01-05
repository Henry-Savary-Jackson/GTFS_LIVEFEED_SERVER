
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

