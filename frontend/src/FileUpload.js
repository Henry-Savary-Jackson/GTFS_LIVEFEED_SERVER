import { useEffect, useState } from 'react';
import { getGTFSStatus, submitGTFS } from './Utils';

export function UploadsGTFS() {
    let [files, setFiles] = useState([])
    let [uploading, setUploading] = useState(false)
    let [status, setStatus] = useState({})

    useEffect(() => {
        // check status periodically
        if (!uploading)
            return

        const abort = new AbortController()
        var interval = setInterval(async () => {
            try {
                const status = await getGTFSStatus(abort.signal)
                // careful
                setStatus(status)
                let textarea = document.getElementById("status-text-area")
                if (textarea)
                    textarea.scrollTop = textarea.scrollHeight
                if (status.status === "done" || status.status === "error") {
                    clearInterval(interval)
                    setUploading(false)
                }
            } catch (error) {
                alert(error.message)
                setUploading(false)
                clearInterval(interval)
            }
        }, 1000)

        return () => {
            abort.abort()
            clearInterval(interval)
        }

    }, [uploading])

    return <div >

        <form className='container d-flex flex-column align-items-center' onSubmit={async (e) => {
            e.preventDefault()
            if (files.length === 0) {
                alert("Upload file!")
                return
            }
            let file = files[0]
            try {
                await submitGTFS(file)
                setUploading(true)
                setStatus({})
            }
            catch (error) {
                console.log(error)
                setUploading(false)
            }
        }} >
            {status && status.status !== "done" && <textarea id="status-text-area" onChange={(e) => e.target.scrollTop = e.target.scrollHeight} readOnly className='border-2 border-primary rounded w-50 form-control' value={status.message || ""}></textarea>}
            {
                status && status.status === "done" && <div className='d-flex flex-column align-items-center'>
                    Success!
                    < a href={window.location.host + '/static/gtfs.zip'}>Zip file</a>
                    <a href={window.location.host + '/static/result/report.html'}>Validation report</a>
                </div>}
            {status && status.status === "error" && <div className='d-flex flex-column align-items-center'><span style={{ "color": "red" }}>Error!</span>

                <a href={window.location.host + '/static/result/report.html'}>Validation report</a>
            </div>}
            <div className='form-group'>
                <label htmlFor='file_input' >Excel File:</label>
                <input onChange={(e) => setFiles([...e.target.files])} className='form-control-file' id='file_input' type='file' />
            </div>
            <input className='btn btn-primary' value="Submit" type='submit' />


        </form></div>

}