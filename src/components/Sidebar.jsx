import { Link, useLocation } from 'react-router-dom'
import { Home, Clock, Calendar, Users, Plane, X } from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/turnos-actuales', icon: Clock, label: 'Turnos Actuales' },
    { path: '/generar-turnos', icon: Calendar, label: 'Generar Turnos' },
    { path: '/colaboradores', icon: Users, label: 'Colaboradores' },
    { path: '/vacaciones', icon: Plane, label: 'Vacaciones' }
  ]

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 480 : false
  const isTablet = typeof window !== 'undefined' ? window.innerWidth >= 480 && window.innerWidth < 768 : false
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true

  return (
    <>
      {/* Overlay para móvil/tablet */}
      {isOpen && (isMobile || isTablet) && (
        <div 
          className="sidebar-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <nav 
        className="sidebar-nav"
        style={{
          position: 'fixed',
          top: '60px',
          bottom: 0, // Ocupa hasta abajo
          left: (isMobile || isTablet) ? (isOpen ? 0 : '-280px') : 0,
          width: isMobile ? '280px' : isTablet ? '300px' : '260px',
          background: '#2c3e50',
          color: 'white',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Botón cerrar en móvil/tablet */}
        <button
          onClick={onClose}
          className="sidebar-close"
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: (isMobile || isTablet) ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            zIndex: 10
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          <X size={isMobile ? 18 : 20} />
        </button>

        {/* Navigation List */}
        <ul 
          className="sidebar-menu"
          style={{ 
            listStyle: 'none', 
            padding: isMobile ? '50px 0 15px 0' : '50px 0 20px 0', // Padding top para el botón cerrar
            margin: 0,
            flex: 1
          }}
        >
          {menuItems.map(({ path, icon: Icon, label }) => (
            <li key={path} style={{ marginBottom: '2px' }}>
              <Link
                to={path}
                onClick={() => {
                  if (isMobile || isTablet) onClose()
                }}
                className="sidebar-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: isMobile ? '12px 15px' : isTablet ? '14px 18px' : '15px 20px',
                  color: 'white',
                  textDecoration: 'none',
                  background: location.pathname === path ? 'rgba(52, 152, 219, 0.2)' : 'transparent',
                  borderLeft: location.pathname === path ? '4px solid #3498db' : '4px solid transparent',
                  borderRight: location.pathname === path ? '2px solid rgba(52, 152, 219, 0.3)' : '2px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: location.pathname === path ? '600' : '500'
                }}
                onMouseOver={(e) => {
                  if (location.pathname !== path) {
                    e.target.style.background = 'rgba(255,255,255,0.08)'
                    e.target.style.transform = 'translateX(4px)'
                    e.target.style.borderLeft = '4px solid rgba(52, 152, 219, 0.3)'
                  }
                }}
                onMouseOut={(e) => {
                  if (location.pathname !== path) {
                    e.target.style.background = 'transparent'
                    e.target.style.transform = 'translateX(0)'
                    e.target.style.borderLeft = '4px solid transparent'
                  }
                }}
              >
                <Icon 
                  size={isMobile ? 16 : isTablet ? 18 : 20} 
                  style={{ 
                    marginRight: isMobile ? '10px' : '12px',
                    opacity: location.pathname === path ? 1 : 0.9,
                    color: location.pathname === path ? '#3498db' : 'inherit'
                  }} 
                />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <span className="hide-xs">{label}</span>
                  <span className="show-xs">
                    {path === '/turnos-actuales' ? 'Turnos' :
                     path === '/generar-turnos' ? 'Generar' :
                     path === '/colaboradores' ? 'Personal' :
                     path === '/vacaciones' ? 'Vacaciones' :
                     label}
                  </span>
                </span>
                {location.pathname === path && (
                  <div 
                    className="active-indicator"
                    style={{
                      position: 'absolute',
                      right: '6px',
                      width: '4px',
                      height: '4px',
                      background: '#3498db',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Footer */}
        <div 
          className="sidebar-footer"
          style={{
            padding: isMobile ? '12px 15px' : '15px 20px',
            textAlign: 'center',
            fontSize: isMobile ? '10px' : '11px',
            color: '#95a5a6',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: '#1a252f',
            flexShrink: 0
          }}
        >
          <div style={{ marginBottom: isMobile ? '4px' : '6px' }}>
            <span className="hide-xs">© 2025 ANGEL ALVAREZ - Sistema de Turnos</span>
            <span className="show-xs">© 2025 Angel Alvarez</span>
          </div>
          <div style={{ 
            fontSize: isMobile ? '9px' : '10px',
            opacity: 0.8
          }}>
            v1.0.0
          </div>
        </div>
      </nav>
    </>
  )
}

export default Sidebar
