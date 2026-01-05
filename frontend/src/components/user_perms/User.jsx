import { Link } from 'react-router';
import { Button, ListGroupItem, Stack, ListGroup, FloatingLabel } from 'react-bootstrap';
import RoleUI from './RoleUI';

export function User({ user, delete_user_callback }) {
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
