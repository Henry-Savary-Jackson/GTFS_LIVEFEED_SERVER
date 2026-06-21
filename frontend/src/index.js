import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { CookiesProvider } from 'react-cookie'
import { region_name } from './Utils';
axios.defaults.baseURL = `/${process.env.REACT_APP_REGION}`

region_name  = `${process.env.REACT_APP_REGION_NAME}`

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CookiesProvider>
      <App />
    </CookiesProvider>
  </React.StrictMode>
);

