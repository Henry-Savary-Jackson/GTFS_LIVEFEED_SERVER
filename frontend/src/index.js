import React from 'react';
import ReactDOM from 'react-dom/client';
import Main from './App';
import { TripUpdate } from './TripUpdate';
import { ServiceAlert} from './ServiceAlert';
import { BrowserRouter, Routes, Route } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
  <BrowserRouter>
  <Routes>
    <Route path='/'>
      <Route index element={<Main/>}/>
      <Route path='trip_update' element={<TripUpdate/>}/>
      <Route path='service_alert' element={<ServiceAlert/>}/>
    </Route>
  </Routes>
  </BrowserRouter>
  </React.StrictMode>
);

