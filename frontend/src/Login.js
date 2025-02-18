import { useState} from 'react';
import  {login} from  './Auth.js'

export function LoginForm(){

    let [error, setError] = useState("")
    let [username, setUsername] = useState("")
    let [password, setPassword] = useState("")
    let [remember_me, setRememberMe] = useState(true)


    return <form onSubmit={(e)=>login(username, password, remember_me).then((r)=>{window.location.reload()}).catch((e)=>setError(e))} >
        <div>{error}</div>
        <div className='form-control'>
            <label>Username</label>
            <input  type='text' value={username} onChange={(e)=>setUsername(e.target.value)} />
        </div>
        <div className='form-control'>
            <label>Password</label>
            <input type='password' value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div className='form-control'>
            <label>Username</label>
            <input type='checkbox' value={remember_me} onChange={(e)=>setRememberMe(e.target.value)} />
        </div>
        <input type='submit'> Submit</input>
    </form>
}