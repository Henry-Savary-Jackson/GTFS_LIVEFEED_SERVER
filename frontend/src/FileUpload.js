import { useState } from 'react';
import { submitGTFS } from './Utils';

export function UploadsGTFS() {
    let [file, setFile] = useState < File > (null)
    let [uploadState, setUploadState] = useState({})
    return <form onClick={async (e) => {
        try {
            await submitGTFS(file)
            setUploadState({
                "error": false,
                "message": "Sucessfully uploaded file"
            })
        }
        catch (error) {
            console.log(error)
            setUploadState({
                "error": true,
                "message": "Failed to upload file:" + error.message
            })
        }
    }} >
        <div className='form-group'>
            <div style={{ background: uploadState.error ? "red" : "green", border: "solid" }} >{uploadState.message}</div>
            <label htmlFor='#file_input' >File</label>
            <input id='file_input' type='file' onChange={(e) => {
                if (e.target.files)
                    setFile(e.target.files[0])
            }} />
        </div>
        <input type='submit'>Submit</input>

    </form>

}