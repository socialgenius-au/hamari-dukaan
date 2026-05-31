import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import OrderSuccess from './OrderSuccess.tsx'
import Import from './Import.tsx'
import './index.css'

const path = window.location.pathname

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/order-success' ? <OrderSuccess /> :
     path === '/import' ? <Import /> :
     <App />}
  </React.StrictMode>,
)
