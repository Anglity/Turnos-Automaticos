import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import TurnosActuales from './components/TurnosActuales'
import GenerarTurnos from './components/GenerarTurnos'
import GestionColaboradores from './components/GestionColaboradores'
import GestionVacaciones from './components/GestionVacaciones'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth > 768)
    }

    // Check initial screen size
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize)

    // Cleanup event listener
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return (
    <Router>
      <div className="app">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="app-body">
          <Sidebar 
            isOpen={isDesktop || sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/turnos-actuales" element={<TurnosActuales />} />
              <Route path="/generar-turnos" element={<GenerarTurnos />} />
              <Route path="/colaboradores" element={<GestionColaboradores />} />
              <Route path="/vacaciones" element={<GestionVacaciones />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
