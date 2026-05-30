import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import OrderSuccess from './OrderSuccess.tsx'
import './index.css'

const path = window.location.pathname

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/order-success' ? <OrderSuccess /> : <App />}
  </React.StrictMode>,
)
