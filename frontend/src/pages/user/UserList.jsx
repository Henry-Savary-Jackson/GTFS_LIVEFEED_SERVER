


import { useContext, useEffect, useState } from 'react';
import { delete_user, list_users } from './Utils.js';
import { alertsContext } from './Globals.js';
import { Link } from 'react-router';
import { Stack } from 'react-bootstrap';
import useAlertPopUp from '../hooks/useAlertPopUp.js';

export function UserList() {
    let [users, setUsers] = useState([])
    let popUpAlert = useAlertPopUp()

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
        <Stack gap={3} className=' d-flex flex-column position-fixed top-50 start-0'>
            <Link className='btn btn-primary' to="/">⬅️ Go back to main page</Link>
        </Stack>
        {users.map((val) => <UserItem delete_user_callback={delete_user_callback} user={val} />)}
        <Link to="/add_user" className='btn btn-success' >Create New User</Link>
    </Stack>
}
