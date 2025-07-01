import { useContext, useEffect, useReducer, useState } from 'react';
import { add_user, delete_user, get, list_users, modify_user } from './Utils.js';
import { alertsContext, UserContext } from './Globals.js';
import { Link, useLocation } from 'react-router';
import { Button, FormGroup, ListGroupItem, Stack, Form, ListGroup, FormLabel, FloatingLabel, Container } from 'react-bootstrap';
import FormCheckInput from 'react-bootstrap/esm/FormCheckInput.js';

class RoleUI {

    static short_to_long = new Map([["view", "View Trip updates and Alerts"],
    ["edit", "Edit Trip updates and Alerts"],
    ["gtfs", "Upload permanent schedules"],
    ["excel", "View the history of Alerts and Trip Updates and get excel summaries "],
    ["admin", "Add, delete or modify users and their permissions"],
    ])


    constructor(short_name, active = false) {
        this.short_name = short_name
        this.long_name = RoleUI.short_to_long.get(short_name)
        this.active = active
    }

}

export function UserItem({ user, delete_user_callback }) {
    return <Stack className=' border d-flex flex-column align-items-center justify-content-center' gap={2}>
        <FloatingLabel>{user.username}</FloatingLabel>
        <ListGroup>
            {user.roles.map((val, i) => <ListGroupItem key={i}>{RoleUI.short_to_long.get(val)}</ListGroupItem>)}
        </ListGroup>
        <Link className='btn btn-primary' to="/add_user" state={user} >Edit</Link>
        <Button variant='danger' onClick={(e) => {
            if (window.confirm(`Are you sure you want to delete ${user.username}?`)) {
                delete_user_callback(user)
            }
        }} >Delete</Button>
    </Stack>
}

export function UserList() {
    let [users, setUsers] = useState([])
    let [alertsVal, popUpAlert] = useContext(alertsContext)

    let refresh_users = async () => setUsers(await list_users())

    useEffect(() => {
        refresh_users()
    }, [])

    async function delete_user_callback(user) {
        try {
            await delete_user(user.username)
            popUpAlert({ "message": `Successfully deleted user ${user.username}`, "type": "success" })
            await refresh_users()
        }
        catch (e) {
            popUpAlert({ "message": e.message, "type": "error" })
        }
    }
    return <Stack className='d-flex flex-column align-items-center justify-content-center' gap={3}>
        {users.map((val) => <UserItem delete_user_callback={delete_user_callback} user={val} />)}
        <Link to="/add_user" className='btn btn-success' >Create New User</Link>
    </Stack>
}

export function AddUserForm() {
    let location = useLocation()
    let user = location ? location.state : null

    const fixed_roles = [new RoleUI("view", true), new RoleUI("edit"), new RoleUI("gtfs"), new RoleUI("excel"), new RoleUI("admin")]

    let [alertVal, popUpAlert] = useContext(alertsContext)
    // let [error, setError] = useState("")
    let [username, setUsername] = useState(user ? user.username : "")
    let [password, setPassword] = useState("")
    let [repeatPassword, setRepeatPassword] = useState("")
    let [roles, setRole] = useReducer((prevState, action) => {
        prevState[action.index].active = action.action === "check"
        return [...prevState]
    }, fixed_roles)

    if (user) {
        roles.forEach((roleUI) => {
            if (roleUI.short_name in user.roles) {
                roleUI.active = true
            }
        })
    }

    return <Form className='gap-3 d-flex flex-column align-items-center justify-content-center' onSubmit={async (e) => {
        e.preventDefault()
        if (username === "") {
            popUpAlert({ "message": "Please enter a username.", "type": "error" })
            return;
        }
        try {
            if (user) {
                await modify_user(user.id, username, password === "" ? undefined : password, roles)
            } else {
                if (password === "") {
                    popUpAlert({ "message": "Please enter a password.", "type": "error" })
                    return;
                }
                if (password !== repeatPassword) {
                    popUpAlert({ "message": "Your password and the repeat password do not match.", "type": "error" })
                    return;
                }
                if (password.length < 10)
                {
                    popUpAlert({ "message": "Your password must have atleast 10 characters.", "type": "error" })
                    return
                }
                await add_user(username, password, roles.filter((val) => val.active).map((val) => val.short_name))
            }
            popUpAlert({ "message": "Successfully added this user.", "type": "success" })
        } catch (error) {
            popUpAlert({ "message": error.message, "type": "error" })
            console.error(error)
        }
    }} >
        {repeatPassword === password || <Container className='text-center' style={{ "background": "red", "color": "white" }}>Password and repeat password do not match!</Container>}
        <FormGroup className='d-flex flex-column align-items-center justify-content-center' >
            <Form.Label  >Username</Form.Label>
            <Form.Control type='text' value={username} onChange={(e) => setUsername(e.target.value)} />
        </FormGroup>
        <FormGroup>
            <Form.Label > Password</Form.Label>
            <Form.Control type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormGroup>
        <FormGroup>
            <Form.Label > Repeat Password</Form.Label>
            <Form.Control type='password' value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
        </FormGroup>
        <FormGroup className='d-flex flex-column align-items-center justify-content-center'>
            <Form.Label >Roles</Form.Label>
            <ListGroup>

                {roles.map((value, index) => <ListGroupItem><Form.Label>{value.long_name}</Form.Label><Form.Check id={value.short_name} className='form-check-input' type='checkbox' checked={value.active} onChange={(e) => { setRole({ "action": e.target.checked ? "check" : "uncheck", "index": index }) }} /> </ListGroupItem>)}
            </ListGroup>
        </FormGroup>
        <Button variant='success' type='submit' >
            Save
        </Button>
        <Link onClick={(e) => {
            if (!window.confirm("Are you sure you want to cancel?")) {
                e.preventDefault()
            }
        }} to="/list_user" className='btn btn-danger'  >
            Cancel
        </Link>
    </Form >
}