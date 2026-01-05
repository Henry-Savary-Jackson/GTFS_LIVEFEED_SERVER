import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlertsProvider } from './provider/AlertsProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>


    <AlertsProvider>
      <UserInfoProvider>
        <App />
      </UserInfoProvider>
    </AlertsProvider>

  </React.StrictMode>
);

