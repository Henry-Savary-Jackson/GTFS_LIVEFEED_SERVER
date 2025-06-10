import { useContext, useEffect, useState } from 'react';
import { getGTFSStatus, submitGTFS, doActionWithAlert } from './Utils';
import { alertsContext } from './Globals';

export function UploadsGTFS() {
    let [files, setFiles] = useState([])
    let [uploading, setUploading] = useState(false)
    let [status, setStatus] = useState({})

    let [alerts, popUpAlert] = useContext(alertsContext)
    useEffect(() => {
        // check status periodically
        if (!uploading)
            return

        const abort = new AbortController()
        var interval = setInterval(async () => {
            await doActionWithAlert(async () => {
                const status_result = await getGTFSStatus(abort.signal)
                // careful
                setStatus(status_result)
                let textarea = document.getElementById("status-text-area")
                if (textarea)
                    textarea.scrollTop = textarea.scrollHeight
                if (status_result.status === "done" || status_result.status === "error") {
                    clearInterval(interval)
                    setUploading(false)
                }
            }, null, () => {
                setUploading(false)
                clearInterval(interval)
            })

        }, 1000)
        return () => {
            abort.abort()
            clearInterval(interval)
        }

    }, [uploading])

    return <div >

        <form className='container d-flex flex-column align-items-center gap-5 fs-3 justify-content-center' onSubmit={async (e) => {
            e.preventDefault()
            if (files.length === 0) {
                popUpAlert({ "message": "Upload file!", "type": "error" })
                return
            }
            let file = files[0]
            await doActionWithAlert(async () => {
                await submitGTFS(file)
                setUploading(true)
                setStatus({})
            }, " ✅ Successfully uploaded the gtfs excel file.", (error) => {
                console.error(error)
                setUploading(false)
            })
        }} >
            {status && status.status !== "done" && <textarea id="status-text-area" onChange={(e) => e.target.scrollTop = e.target.scrollHeight} readOnly className='border-2 border-primary rounded w-100 fs-4 form-control' style={{ "height": "450px" }} value={status.message || ""}></textarea>}
            {
                status && status.status === "done" && <div className='d-flex flex-column align-items-center'>
                    Success!
                    < a href='/static/shared/gtfs.zip'>Zip file</a>
                    <a href='/static/shared/result/report.html'>Validation report</a>
                </div>}
            {status && status.status === "error" && <div className='d-flex flex-column align-items-center'><span style={{ "color": "red" }}>Error!</span>
                {'validation_report' in status && status.validation_report && <a href='/static/shared/result/report.html'>Validation report</a>
                }</div>
            }
            <div className='form-group'>
                <label htmlFor='file_input' >Excel File:</label>
                <input onChange={(e) => setFiles([...e.target.files])} className='form-control-file' id='file_input' type='file' />
            </div>
            <input className='btn btn-primary fs-3' value="Submit" type='submit' />
        </form></div>

}