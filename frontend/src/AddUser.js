import { useContext, useEffect, useReducer, useState } from 'react';
import { add_user , get, list_users} from './Utils.js';
import { UserContext } from './Globals.js';
import { Link } from 'react-router';

class RoleUI {

    static  short_to_long = new Map([["view", "View Trip updates and Alerts"],
    ["edit", "Edit Trip updates and Alerts"],
    ["gtfs", "Upload permanent schedules"],
    ["excel", "View the history of Alerts and Trip Updates and get excel summaries "],
    ["admin", "Add, delete or modify users and their permissions"],
    ])


    constructor(short_name, active = false) {
        this.short_name = short_name
        this.long_name = RoleUI.short_to_long[short_name]
        this.active = active
    }

}

export function UserItem({user}){
    return <div>
        <span>{user.username}</span>
        <ul>
            {user.roles.map((val,i)=><li key={i}>val</li>)}
        </ul>
        <Link >Edit</Link>
        <button >Edit</button>
    </div>
}

// export function UserList(){
//     let [users , setUsers] = useState([])

//     useEffect(()=>{
//         (async ()=>setUsers(await list_users()))()
//     }, [])

//    return <div>
//         {users,}

//    </div>
// }

export function AddUserForm({user_id}) {
    let [user, setUser] = useContext(UserContext)

    const fixed_roles = [new RoleUI("view", true), new RoleUI("edit"), new RoleUI("gtfs"), new RoleUI("excel"), new RoleUI("admin")]

    let [error, setError] = useState("")
    let [username, setUsername] = useState("")
    let [password, setPassword] = useState("")
    let [roles, setRole] = useReducer((prevState, action) => {
        prevState[action.index].active = action.action === "check"
        return [...prevState]
    }, fixed_roles)

    return <form className='container gap-3 w-100 d-flex flex-column align-items-center justify-content-center' onSubmit={async (e) => {
        e.preventDefault()
        try {
            await add_user(username, password, roles.filter((val)=>val.active).map((val)=>val.short_name))
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
        <div className='form-group d-flex flex-column align-items-center justify-content-center'>
            <label htmlFor="roles-input">Roles</label>
            {roles.map((value, index) => <input className='form-check-input' type='checkbox' checked={value.active} onChecked={(e) => { setRole({ "action": e.target.checked ? "check" : "uncheck", "index": index }) }} />)}
        </div>
    </form >
}