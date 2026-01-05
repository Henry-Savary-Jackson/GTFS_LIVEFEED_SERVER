import { useEffect } from 'react';
import { setCSRFToken, get_csrf, getRoutesIDToNames } from './utils/RequestUtils'
import { TripUpdate } from './pages/TripUpdate';
import { ServiceAlert } from './pages/ServiceAlert';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from './pages/Login';
import { UploadsGTFS } from './pages/GTFSUpload';
import { AddUserForm, UserList } from './AddUser';
import { AlertsProvider } from './provider/AlertsProvider';
import { ExcelList } from './pages/ExcelList';
import UserInfoProvider from './provider/UserInfoProvider';
import useUserInfo from './hooks/useUserInfo';


export default function App() {
  
  let {username, roles} = useUserInfo()

  useEffect(() => {
    // fetch the csrf token asynchronously
    (async () => setCSRFToken(await get_csrf()))()
  }, [])

  getRoutesIDToNames() // populates a hashmap with the correspondes of route ids to names
  return <BrowserRouter>
    <Routes>
      <Route path='/'>
        <Route index element={username ? <Main /> : <LoginForm />} />
        <Route path='trip_update' element={username ? <TripUpdate /> : <LoginForm />} />
        <Route path='service_alert' element={username ? <ServiceAlert /> : <LoginForm />} />
        <Route path='upload_gtfs' element={username && roles.includes("gtfs") ? <UploadsGTFS /> : <LoginForm />} />
        <Route path='add_user' element={username && roles.includes("admin") ? <AddUserForm /> : <LoginForm />} />
        <Route path='list_user' element={username && roles.includes("admin") ? <UserList /> : <LoginForm />} />
        <Route path='list_excel' element={username && roles.includes("excel") ? <ExcelList /> : <LoginForm />} />
      </Route>
    </Routes>
  </BrowserRouter>
}
