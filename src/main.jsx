import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import firebaseService from './services/firebaseService'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Activar actualización semanal automática de 'semanaActual' cada lunes 00:00
try {
  firebaseService.activarActualizacionSemanal();
} catch (e) {
  console.warn('No se pudo activar la actualización semanal automáticamente:', e);
}
