import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#191c24',
              color: '#e8eaf0',
              border: '0.5px solid rgba(255,255,255,0.07)',
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
            },
            success: { iconTheme: { primary: '#00d4aa', secondary: '#000' } },
            error:   { iconTheme: { primary: '#f04e6a', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
