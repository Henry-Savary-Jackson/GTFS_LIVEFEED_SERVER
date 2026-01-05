import { useState, useEffect } from 'react';
import { logout, getTimeSinceLastGTFS } from './Utils'
import { Link } from "react-router-dom";
import { Image, Stack, Button } from 'react-bootstrap'
import useUserInfo from './hooks/useUserInfo';



export function Main() {

  [username, setUsername, roles, setRoles] = useUserInfo()

  const logout_cookie = () => { setUsername(""); setRoles([]) }

  let [time_last_sched, set_time_since_last_schedules] = useState(null)

  useEffect(() => {
    async function setTime() {
      set_time_since_last_schedules(new Date(Number(await getTimeSinceLastGTFS()) * 1000))
    }
    setTime()
  }, [])


  return <Stack gap={4} className='d-flex flex-column align-items-center justify-content-center' >
    <Image src='/static/prasa-main.png' width={250} height={100} />
    {roles.includes("gtfs") && <Link className='btn btn-primary' to="/upload_gtfs">Upload GTFS permanent schedules excel file </Link>}
    <Button href='/gtfs/gtfs.xlsx'><Image src="/static/xlsx-logo.png" width={30} height={35} />Latest Excel file </Button>
    <span>(last modified : {(time_last_sched && `${time_last_sched.toDateString()} ${time_last_sched.toLocaleTimeString()}`) || ""})</span>
    <Button href='/gtfs/gtfs.zip'><Image src="/static/zip-file.svg" width={30} height={35} />GTFS zip for permanent schedules</Button>
    {roles.includes("admin") && <Link className='btn btn-primary mt-2' to="/list_user">Manage user access </Link>}
    {roles.includes("excel") && <Link className='btn btn-primary' to="/list_excel">Manage tracking excels</Link>}
    {roles.includes("edit") && <Link className=' btn btn-primary' to="/service_alert">Create new Service Alert</Link>}
    {roles.includes("edit") && <Link className=' btn btn-primary' to="/trip_update">Create new trip update</Link>}
    <Button variant='danger' onClick={async (e) => {
      try {
        e.preventDefault()
        await logout()
      } catch (error) {
        if (error.title) {
          alert(`${error.title}:\n${error.message}`)
        } else {
          alert(error)
        }
      } finally {
        logout_cookie()
        window.location.pathname = "/"
      }
    }} href='/auth/logout'>Logout</Button>
    <Feed />
    <Image src='/static/lines.png' width={500} height={500} />
  </Stack>
}
