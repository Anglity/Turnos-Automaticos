import { Menu, Calendar, Users } from 'lucide-react'
import { restaurarDatosOriginales } from '../services/turnosService'

const Header = ({ onMenuClick }) => {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 480 : false
  const isTablet = typeof window !== 'undefined' ? window.innerWidth >= 480 && window.innerWidth < 768 : false
  
  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: isMobile ? '10px 8px' : isTablet ? '12px 12px' : '15px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 1001,
      minHeight: isMobile ? '50px' : '60px',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        flex: 1,
        minWidth: 0
      }}>
        <button
          onClick={onMenuClick}
          className="p-xs"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            marginRight: isMobile ? '6px' : '10px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            minWidth: '32px',
            height: '32px',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          <Menu size={isMobile ? 18 : 22} />
        </button>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          minWidth: 0,
          flex: 1
        }}>
          <Calendar size={isMobile ? 20 : isTablet ? 22 : 24} style={{ 
            marginRight: isMobile ? '6px' : '8px',
            flexShrink: 0 
          }} />
          <h1 style={{ 
            fontSize: isMobile ? '14px' : isTablet ? '16px' : '22px', 
            fontWeight: '600',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <span className="hide-xs hide-sm">SISTEMA DE TURNOS AUTOMATICOS</span>
            
          </h1>
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          onClick={() => {
            // Limpiar completamente el localStorage para eliminar datos incorrectos
            localStorage.removeItem('turnosData');
            
            // Forzar recarga completa desde JSON
            import('../services/turnosService').then(({ restaurarDatosOriginales }) => {
              restaurarDatosOriginales();
              
              // Recargar la página para asegurar datos frescos
              window.location.reload();
            });
          }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          🔄 LIMPIAR Y ACTUALIZAR
        </button>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: isMobile ? '10px' : isTablet ? '12px' : '14px',
          flexShrink: 0,
          marginLeft: '8px'
        }}>
          <Users size={isMobile ? 14 : isTablet ? 16 : 20} style={{ 
            marginRight: isMobile ? '4px' : '6px' 
          }} />
          <span className="hide-xs">BANFONDESA - </span>
          <span className="hide-xs hide-sm"> OPERACIONES TI</span>
        </div>
      </div>
    </header>
  )
}

export default Header
