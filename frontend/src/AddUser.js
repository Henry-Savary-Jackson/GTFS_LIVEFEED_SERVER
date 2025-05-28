import { useContext, useState } from 'react';
import { add_user } from './Utils.js';
import { UserContext } from './Globals.js';

export function AddUserForm() {
    let [user, setUser] = useContext(UserContext)

    let [error, setError] = useState("")
    let [username, setUsername] = useState("")
    let [password, setPassword] = useState("")
    let [role, setRole] = useState("")

    return <form className='container gap-3 d-flex flex-column align-items-center justify-content-center' onSubmit={async (e) => {
        e.preventDefault()
        try {
            await add_user(username, password, [role])
        } catch (error) {
            setError(error.message)
            console.error(error)
        }
    }} >
        <div className='text-center' style={{ "background": "red", "color": "white" }}>{error}</div>
        <div className='form-group'>
            <label htmlFor='username-input' >Username</label>
            <input id="username-input" className='form-control' type='text' value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className='form-group'>
            <label htmlFor="pass-input"> Password</label>
            <input id="pass-input" className='form-control' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className='form-group'>
            <label htmlFor="roles-input">Roles</label>
            <div id ='roles-input' onChange={(e) => { setRole(e.target.value) }} className='form-group' >
                <input className='form-control' checked={role==='admin'} value="admin" type='radio'  name='role'/> Admin
                <input className='form-control' checked={role==="user"}  value="user" type='radio' name='role'/> User
            </div>
    </div>


    </form >
}