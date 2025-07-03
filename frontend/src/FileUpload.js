import { useContext, useEffect, useRef, useState } from 'react';
import { getGTFSStatus, submitGTFS, doActionWithAlert } from './Utils';
import { alertsContext } from './Globals';
import { io, Socket } from "socket.io-client"
import { ExcelList } from './Excel';


export function UploadsGTFS() {
    let [files, setFiles] = useState([])
    let [validationReport, setHasValidationReport] = useState(false)
    let [status, setStatus] = useState({})
    let [text, setText] = useState("")
    let [uploading, setUploading] = useState(false)
    let socketRef = useRef(null)

    let [alerts, popUpAlert] = useContext(alertsContext)

    const onMessage = (event) => {
        setText((prevText) => prevText + "\n" + event.message)
        setStatus(event.status)
        if (event.status !== "working") {
            socketRef.current.disconnect()
        }
        if ("validationReport" in event)
            setHasValidationReport(true)
        let textarea = document.getElementById("status-text-area")
        if (textarea)
            textarea.scrollTop = textarea.scrollHeight
    }
    const onConnect = (event) => {
        popUpAlert({ "message": "Connected to status of upload", "type": "success" })

    }
    const onConnectFailed = (event) => {
        popUpAlert({ "message": "Failed to connect Connection to status of upload", "type": "error" })

    }
    const onDisconnect = (event) => {
        popUpAlert({ "message": "Lost Connection to status of upload", "type": "error" })
    }

    useEffect(() => {

        let socket = io(`wss://${window.location.host}`, { withCredentials: true, path: "/ws", transports: ["websocket"], reconnection: true, reconnectionAttempts: 5, retries: 5, secure: true, autoConnect: false })
        socketRef.current = socket
        socket.on("event", onMessage)
        socket.on('connect_failed', onConnectFailed);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        return () => {
            socket.off("event", onMessage)
            socket.off('connect_failed', onConnectFailed);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.disconnect()
        }
    }, [])


    return <div >
        <form className='container d-flex flex-column align-items-center gap-5 fs-3 justify-content-center' onSubmit={async (e) => {
            e.preventDefault()
            if (files.length === 0) {
                popUpAlert({ "message": "Upload file!", "type": "error" })
                return
            }
            let file = files[0]
            await doActionWithAlert(async () => {
                let task_id = await submitGTFS(file)
                setHasValidationReport(false)
                setUploading(true)
                setText("")
                if (socketRef.current) {
                    setTimeout(() => {
                        socketRef.current.disconnect()
                        socketRef.current.connect()
                        socketRef.current.emit("join-room", { "room": task_id })
                    }, 3000)
                } else {
                    throw new Error("No socket")
                }
            }, " ✅ Successfully uploaded the gtfs excel file.", popUpAlert, (error) => {
                console.error(error)
            })

        }} >
            {status && status !== "done" && <textarea id="status-text-area" onChange={(e) => e.target.scrollTop = e.target.scrollHeight} readOnly className='border-2 border-primary rounded w-100 fs-4 form-control' style={{ "height": "450px" }} value={text || ""}></textarea>}
            {
                status && status === "done" && <div className='d-flex flex-column align-items-center'>
                    Success!
                    < a href='/static/shared/gtfs.zip'>Zip file</a>
                    <a href='/static/shared/result/report.html'>Validation report</a>
                </div>}
            {status && status === "error" && <div className='d-flex flex-column align-items-center'><span style={{ "color": "red" }}>Error!</span>
                {validationReport && <a href='/static/shared/result/report.html'>Validation report</a>
                }</div>
            }
            <div className='form-group'>
                <label htmlFor='file_input' >Excel File:</label>
                <input onChange={(e) => setFiles([...e.target.files])} className='form-control-file' id='file_input' type='file' />
            </div>
            <input className='btn btn-primary fs-3' value="Submit" type='submit' />
        </form></div>

}