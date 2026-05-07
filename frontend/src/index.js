import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { CookiesProvider } from 'react-cookie'
axios.defaults.baseURL = `/${process.env.REACT_APP_REGION}`

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CookiesProvider>
      <App />
    </CookiesProvider>
  </React.StrictMode>
);

