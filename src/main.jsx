import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
