import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(

  <StrictMode>
      {/*Strict mode to catch side effects by rendering components twice*/}
      {/*Browser Router enables client-side routing without needing to reload thew page*/}
    <BrowserRouter>
        {/*AuthProvider provides authentication context to the app*/}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
