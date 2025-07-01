import { useContext, useState } from 'react';
import { login } from './Utils.js';
import { RolesContext, UserContext } from './Globals.js';

export function LoginForm() {
    let [user, setUser] = useContext(UserContext)
    let [roles, setRoles] = useContext(RolesContext)

    let [error, setError] = useState("")
    let [username, setUsername] = useState("")
    let [password, setPassword] = useState("")
    let [remember_me, setRememberMe] = useState(true)

    return <form className='container gap-3 d-flex flex-column align-items-center justify-content-center' onSubmit={async (e) => {
        e.preventDefault()
        try {
            let roles = (await login(username, password, remember_me)).data
            setRoles(roles)
            setUser(username)
            window.location.reload()
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
        <div className='form-check'>
            <label htmlFor='remember-check' className='form-check-label'>Remember Me</label>
            <input id="remember-check" className='form-check-input' type='checkbox' checked={remember_me} onChange={(e) => setRememberMe(e.target.value)} />
        </div>
        <input className='btn btn-primary' value="Submit" type='submit' />
    </form>
}