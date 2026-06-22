import { useContext, useEffect, useRef, useState } from 'react';
import { Button , Stack} from 'react-bootstrap'
import { Link } from 'react-router';
import { getGTFSStatus, submitGTFS, doActionWithAlert } from './Utils';
import { alertsContext, CSRFContext } from './Globals';
import { io, Socket } from "socket.io-client"
import { ExcelList } from './Excel';
import axios from 'axios';


export function UploadsGTFS() {
    let [files, setFiles] = useState([])
    let [validationReport, setHasValidationReport] = useState(false)
    let [status, setStatus] = useState({})
    let [text, setText] = useState("")
    let [uploading, setUploading] = useState(false)
    let socketRef = useRef(null)

    let [alerts, popUpAlert] = useContext(alertsContext)
    let [csrf, setCSRF] = useContext(CSRFContext)

    const onMessage = (event) => {
        setText((prevText) => prevText + "\n" + event.message)
        setStatus(event.status)
        if (event.status !== "working" && event.status !== "error-cont") { // TODO Make the stauts code cleaner if possible
            socketRef.current.disconnect()
        }
        if ("validation_report" in event && event.validation_report)
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

        let socket = io(`wss://${window.location.host}`, { withCredentials: true, path: `${axios.defaults.baseURL}/ws`, transports: ["websocket"], reconnection: true, reconnectionAttempts: 5, retries: 5, secure: true, autoConnect: false })
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
        <Stack gap={3} className=' d-flex flex-column position-fixed top-50 start-0'>
            <Link className='btn btn-primary' to="../">⬅️ Go back to main page</Link>
        </Stack>
        <form className='container d-flex flex-column align-items-center gap-5 fs-3 justify-content-center' onSubmit={async (e) => {
            e.preventDefault()
            if (files.length === 0) {
                popUpAlert({ "message": "Upload file!", "type": "error" })
                return
            }
            let file = files[0]
            await doActionWithAlert(async () => {
                let task_id = await submitGTFS(file, csrf)
                setHasValidationReport(false)
                setUploading(true)
                setText("")
                setStatus("working")
                if (socketRef.current) {

                    socketRef.current.disconnect()
                    socketRef.current.connect()
                    socketRef.current.emit("join-room", { "room": task_id })
                } else {
                    throw new Error("No socket")
                }
            }, " ✅ Successfully uploaded the gtfs excel file.", popUpAlert, (error) => {
                console.error(error)
            })

        }} >

            {status && status !== "done" && <textarea id="status-text-area" onChange={(e) => e.target.scrollTop = e.target.scrollHeight} readOnly className='border-2 border-primary rounded w-100 fs-4 form-control' style={{ "height": "450px" }} value={text || ""}></textarea>}

            <Button href='gtfs/report'>Latest validation report</Button>
            {
                status && status === "done" && <div className='d-flex flex-column align-items-center'>
                    Success!
                    < a href='gtfs/gtfs.zip'>Zip file</a>
                    <a href='gtfs/report'>Validation report</a>
                </div>}
            {status && status === "error" && <div className='d-flex flex-column align-items-center'><span style={{ "color": "red" }}>Error!</span>
                {validationReport && <a href='gtfs/report'>Validation report</a>
                }</div>
            }
            <div className='form-group'>
                <label htmlFor='file_input' >Excel File:</label>
                <input onChange={(e) => setFiles([...e.target.files])} className='form-control-file' id='file_input' type='file' />
            </div>
            <input className='btn btn-primary fs-3' value="Submit" type='submit' />
        </form></div>

}