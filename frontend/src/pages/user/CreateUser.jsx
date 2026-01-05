import { useContext, useReducer, useState } from 'react';
import { add_user, modify_user } from './Utils.js';
import { alertsContext } from './Globals.js';
import { Link, useLocation } from 'react-router';
import { Button, FormGroup, ListGroupItem, Form, ListGroup, Container } from 'react-bootstrap';


export default function CreateUser() {
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