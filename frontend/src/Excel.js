import { createRef, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { add_user, delete_excel_file, get, get_list_excels, list_users, order_new_excel } from './Utils.js';
import { ListGroup, Button, ListGroupItem, Spinner, Stack, Container } from 'react-bootstrap'
import { io } from 'socket.io-client'
import { alertsContext } from './Globals.js';
import { Link } from 'react-router-dom';

export function ExcelList() {

    let [excel_files, set_excel_files] = useState([])
    let [loading, setLoading] = useState(false)
    let [alertsVal, popUpAlert] = useContext(alertsContext)
    let socketRef = useRef(null)

    let  reload_excels= (async () => { set_excel_files(await get_list_excels()) })

    useEffect(() => {
        if (loading)
            return
        reload_excels()
    }, [loading])


    function onFinished(event) {
        setLoading(false)
        if (event.status !== "success") {
            popUpAlert({ "message": event.message, "type": "error" })
        } else {

            popUpAlert({ "message": `Sucessfully create summary excel ${event.message}`, "type": "success" })
        }
        if (socketRef.current) {
            socketRef.current.disconnect()
        }
    }

    function onDisconnect(event) {
        setLoading(false)
    }
    function onConnectFailed(event) {
        setLoading(false)
        popUpAlert({ "message": "Failed to connect to file status.", "type": "error" })
    }

    useEffect(() => {
        let newSocket = io(`wss://${window.location.host}`, { path: "/ws", transports: ["websocket"], reconnection: true, reconnectionAttempts: 5, retries: 5, secure: true, autoConnect: false })
        socketRef.current = newSocket
        newSocket.on("finished", onFinished)
        newSocket.on("disconnect", onDisconnect)
        newSocket.on("connect_failed", onConnectFailed)
        return () => {
            newSocket.off("finished", onFinished)
            newSocket.off("disconnect", onDisconnect)
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
                {excel_files.map((val, i) => <ListGroupItem key={i} ><a href={`/excel/${val}`} >{val} </a><Button onClick={async(e) => { await delete_excel_file(val); await reload_excels()  }} variant='danger'>X</Button></ListGroupItem>)}
            </ListGroup>
            <Button disabled={loading} onClick={async (e) => {
                try {
                    let task_id = await order_new_excel()
                    if (socketRef.current) {
                        socketRef.current.connect()
                        setLoading(true)
                        socketRef.current.emit("join-room", { "room": task_id })
                    } else {
                        popUpAlert({ "message": "event.message", "type": "error" })
                    }
                } catch (e) {
                    popUpAlert({ "message": `${e.title} , ${e.description}`, "type": "error" })
                }
            }} >Make new excel summary</Button>
            <Spinner variant="primary" animation='border' hidden={!loading} ></Spinner>
        </Stack >
    </Container>
}

