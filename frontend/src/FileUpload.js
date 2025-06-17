import { useContext, useEffect, useState } from 'react';
import { getGTFSStatus, submitGTFS, doActionWithAlert } from './Utils';
import { alertsContext } from './Globals';
import { io } from "socket.io-client"


export function UploadsGTFS() {
    let [files, setFiles] = useState([])
    let [validationReport, setHasValidationReport] = useState(false)
    let [status, setStatus] = useState({})
    let [text, setText] = useState("")

    let [alerts, popUpAlert] = useContext(alertsContext)

    const socket = io("ws://"+window.location.host+"/ws/gtfs_upload", { autoConnect: false })

    socket.on("message", (event) => {
        setText(text + "\n" + event.message)
        setStatus(event.status)
        if ("validationReport" in event)
            setHasValidationReport(true)
        let textarea = document.getElementById("status-text-area")
        if (textarea)
            textarea.scrollTop = textarea.scrollHeight
    })

    useEffect(() => {
        if (status === "error"){
            popUpAlert(text)
            socket.disconnect()
        }
    }, [status])

    return <div >
        <form className='container d-flex flex-column align-items-center gap-5 fs-3 justify-content-center' onSubmit={async (e) => {
            e.preventDefault()

            if (files.length === 0) {
                popUpAlert({ "message": "Upload file!", "type": "error" })
                return
            }
            let file = files[0]
            await doActionWithAlert(async () => {
                setHasValidationReport(false)
                await submitGTFS(file)
            }, " ✅ Successfully uploaded the gtfs excel file.", (error) => {
                console.error(error)
            })
            socket.connect()
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