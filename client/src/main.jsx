import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 
// 1. Import the AuthProvider
import { AuthProvider } from './context/AuthContext' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap App inside AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)