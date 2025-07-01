import { createRef, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { add_user, get, get_list_excels, list_users, order_new_excel } from './Utils.js';
import { ListGroup, Button, ListGroupItem, Spinner, Stack, Container } from 'react-bootstrap'
import { io } from 'socket.io-client'
import { alertsContext } from './Globals.js';
import { Link } from 'react-router-dom';

export function ExcelList() {

    let [excel_files, set_excel_files] = useState([])
    let [create_status, set_create_status] = useState("")
    let [alertsVal, popUpAlert] = useContext(alertsContext)
    let [task_id, set_task_id] = useState("")
    let socketRef = useRef(null)


    useEffect(() => {
        if (create_status !== "")
            return
        (async () => { set_excel_files(await get_list_excels()) })()
    }, [create_status])

    useEffect(() => {
        if (create_status === "" && socketRef.current) {
            socketRef.current.disconnect()
        } else if (create_status === "loading" && task_id !== "") {
            if (socketRef.current) {
                socketRef.current.connect()
                socketRef.current.emit("join-room", { "room": task_id })
            } else {
                popUpAlert({ "message": "event.message", "type": "error" })
            }
        }
    }, [create_status])

    function onFinished(event) {
        set_create_status("")
        if (event.status !== "success") {
            popUpAlert({ "message": event.message, "type": "error" })
        } else {

            popUpAlert({ "message": `Sucessfully create summary excel ${event.message}`, "type": "success" })
        }
    }

    function onDisconnect(event) {
        set_create_status("")
        popUpAlert({ "message": "Disconnected", "type": "error" })
    }
    function onConnectFailed(event) {
        set_create_status("")
        popUpAlert({ "message": "Failed to connect to file status.", "type": "error" })
    }

    useEffect(() => {
        let newSocket = io(`wss://${window.location.host}`, { path: "/ws", transports: ["websocket"], reconnection: true, reconnectionAttempts: 5, retries: 5, secure: true, autoConnect: false })
        socketRef.current = newSocket
        newSocket.on("finished", onFinished)
        // newSocket.on("disconnect", onDisconnect)
        newSocket.on("connect_failed", onConnectFailed)
        return () => {
            newSocket.off("finished", onFinished)
            // newSocket.off("disconnect", onDisconnect)
            newSocket.off("connect_failed", onConnectFailed)
            newSocket.disconnect()
        }
    }, [])

    return <Container>
        <Stack gap={3} className=' d-flex flex-column position-fixed top-50 start-0'>
            <Link className='btn btn-primary' to="/">⬅️ Go back to main page</Link>
        </Stack>
        <Stack className='d-flex flex-column  align-items-center 
                        justify-content-center' ><span>List of all the summary excels</span><ListGroup  >
                {excel_files.map((val, i) => <ListGroupItem key={i} ><a href={`/excel/${val}`} >{val} </a></ListGroupItem>)}
            </ListGroup>
            <Button onClick={async (e) => {
                try {
                    set_task_id(await order_new_excel())
                    set_create_status("loading")
                } catch (e) {
                    popUpAlert({ "message": `${e.title} , ${e.description}`, "type": "error" })
                }
            }} >Make new excel summary</Button>
            <Spinner variant="primary" animation='border' hidden={create_status !== "loading"} ></Spinner>
        </Stack >
    </Container>
}

