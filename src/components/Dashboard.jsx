import { useState, useEffect } from 'react'
import { Calendar, Users, Clock, Activity } from 'lucide-react'
import { generarTurnosPorSemana, aplicarReemplazos, cargarColaboradores, cargarVacaciones } from '../services/turnosService'
import { obtenerLunesDelamSemana, obtenerDomingoDeLaSemana, formatearRangoSemana } from '../utils/fechas'

const Dashboard = () => {
  const [turnosActuales, setTurnosActuales] = useState(null)
  const [fechaActual, setFechaActual] = useState(new Date())

  const cargarTurnos = () => {
    try {
      const turnos = generarTurnosPorSemana(fechaActual)
      const lunes = obtenerLunesDelamSemana(fechaActual)
      const domingo = obtenerDomingoDeLaSemana(fechaActual)
      const turnosConReemplazos = aplicarReemplazos(turnos, lunes, domingo)
      
      setTurnosActuales({
        ...turnosConReemplazos,
        fechaInicio: lunes,
        fechaFin: domingo
      })
    } catch (error) {
      console.error('Error al cargar turnos:', error)
    }
  }

  useEffect(() => {
    cargarTurnos()
    
    // Escuchar cambios en los datos para actualizar el dashboard
    const handleDataChange = () => {
      cargarTurnos()
    }

    window.addEventListener('turnosDataChanged', handleDataChange)

    return () => {
      window.removeEventListener('turnosDataChanged', handleDataChange)
    }
  }, [fechaActual])

  if (!turnosActuales) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <Activity size={32} />
          <p>Cargando turnos...</p>
        </div>
      </div>
    )
  }

  const totalColaboradores = turnosActuales.nivel1.length + turnosActuales.nivel2.length + turnosActuales.nivel3.length
  
  // Calcular estadísticas correctas
  const todosLosColaboradores = [
    ...turnosActuales.nivel1,
    ...turnosActuales.nivel2,
    ...turnosActuales.nivel3
  ]
  
  // Contar colaboradores de vacaciones incluyendo los que tienen reemplazo
  const lunes = turnosActuales.fechaInicio
  const domingo = turnosActuales.fechaFin
  const colaboradoresList = cargarColaboradores()
  const vacacionesList = cargarVacaciones()
  
  // Contar todos los colaboradores que están de vacaciones en esta semana
  const colaboradoresEnVacaciones = colaboradoresList.filter(c => 
    c.activo && vacacionesList.some(v => 
      v.colaboradorId === c.id &&
      v.activo &&
      new Date(v.fechaInicio) <= new Date(domingo) &&
      new Date(v.fechaFin) >= new Date(lunes)
    )
  )
  
  const totalVacaciones = colaboradoresEnVacaciones.length
  const totalActivos = todosLosColaboradores.filter(c => !c.enVacaciones && !c.esReemplazo).length + 
                      todosLosColaboradores.filter(c => c.esReemplazo).length
  const totalGeneral = colaboradoresList.filter(c => c.activo).length

  return (
    <div>
      {/* Estadísticas principales */}
      <div className="stats-grid" style={{ 
        marginBottom: '30px'
      }}>
        {/* Tarjeta Semana Actual */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div className="stat-icon">
            <span style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>📅</span>
          </div>
          <h3 style={{ fontSize: '16px', margin: '8px 0 5px 0', fontWeight: '600' }}>
            Semana Actual
          </h3>
          <p className="stat-value" style={{ 
            fontSize: '13px',
            lineHeight: 1.3,
            margin: '6px 0'
          }}>
            Semana #{turnosActuales.numeroSemana}
          </p>
          <p className="stat-subtitle">
            Grupo {turnosActuales.grupoEnNivel1} en Nivel 1
          </p>
        </div>

        {/* Tarjeta Total Activos */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div className="stat-icon">
            <span style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>👥</span>
          </div>
          <h3 style={{ fontSize: '16px', margin: '8px 0 5px 0', fontWeight: '600' }}>
            Activos en Turnos
          </h3>
          <p style={{ 
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '6px 0'
          }}>
            {totalActivos}
          </p>
          <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>
            Trabajando esta semana
          </p>
        </div>

        {/* Tarjeta Vacaciones */}
        <div className="card" style={{ 
          background: totalVacaciones > 0 ? 
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div className="stat-icon">
            <span style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>🏖️</span>
          </div>
          <h3 style={{ fontSize: '16px', margin: '8px 0 5px 0', fontWeight: '600' }}>
            Vacaciones
          </h3>
          <p style={{ 
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '6px 0'
          }}>
            {totalVacaciones}
          </p>
          <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>
            Ausentes esta semana
          </p>
        </div>

        {/* Tarjeta Total General */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', 
          color: '#333',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div className="stat-icon">
            <span style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>📊</span>
          </div>
          <h3 style={{ fontSize: '16px', margin: '8px 0 5px 0', fontWeight: '600' }}>
            Total General
          </h3>
          <p style={{ 
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '6px 0'
          }}>
            {totalGeneral}
          </p>
          <p style={{ fontSize: '11px', opacity: 0.8, margin: 0 }}>
            Colaboradores activos
          </p>
        </div>
      </div>

      {/* Vista rápida de turnos actuales */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ marginBottom: '20px', color: '#495057' }}>
            Turnos de la Semana Actual
          </h2>
        </div>
        
        {/* Nivel 1 */}
        <div className="nivel-section">
          <div 
            className="nivel-header moderno"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <div className="nivel-info">
              <span className="nivel-icon">🟦</span>
              <span className="nivel-nombre">1er NIVEL - ATENCIÓN FUERA DE HORARIO</span>
              <span className="nivel-contador">({turnosActuales.nivel1.length})</span>
            </div>
          </div>
          <div className="nivel-content">
            <div className="table-container responsivo">
              <table className="turnos-tabla moderna">
                <thead>
                  <tr>
                    <th>👤 Colaborador</th>
                    <th>🏢 Unidad</th>
                    <th>📞 Teléfono</th>
                    <th>📊 Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosActuales.nivel1.map((colaborador) => (
                    <tr key={colaborador.id} className="fila-colaborador">
                      <td className="colaborador-info">
                        <div className="colaborador-nombre">
                          {colaborador.nombre}
                          {colaborador.esReemplazo && (
                            <div className="reemplazo-indicator">
                              <small>⬆️ Reemplazo de {colaborador.reemplazaA}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="unidad-info">
                        <span className="unidad-badge">{colaborador.unidad}</span>
                      </td>
                      <td className="telefono-info">
                        <a href={`tel:${colaborador.telefono}`} className="telefono-link">
                          {colaborador.telefono}
                        </a>
                      </td>
                      <td className="estado-info">
                        {colaborador.enVacaciones ? (
                          <span className="estado-badge moderno estado-vacaciones">
                            🏖️ Vacaciones
                          </span>
                        ) : colaborador.esReemplazo ? (
                          <span className="estado-badge moderno estado-reemplazo">
                            ⬆️ Reemplazo
                          </span>
                        ) : (
                          <span className="estado-badge moderno estado-activo">
                            ✅ Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Nivel 2 */}
        <div className="nivel-section">
          <div 
            className="nivel-header moderno"
            style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
          >
            <div className="nivel-info">
              <span className="nivel-icon">🟨</span>
              <span className="nivel-nombre">2do NIVEL - ATENCIÓN FUERA DE HORARIO</span>
              <span className="nivel-contador">({turnosActuales.nivel2.length})</span>
            </div>
          </div>
          <div className="nivel-content">
            <div className="table-container responsivo">
              <table className="turnos-tabla moderna">
                <thead>
                  <tr>
                    <th>👤 Colaborador</th>
                    <th>🏢 Unidad</th>
                    <th>📞 Teléfono</th>
                    <th>📊 Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosActuales.nivel2.map((colaborador) => (
                    <tr key={colaborador.id} className="fila-colaborador">
                      <td className="colaborador-info">
                        <div className="colaborador-nombre">{colaborador.nombre}</div>
                      </td>
                      <td className="unidad-info">
                        <span className="unidad-badge">{colaborador.unidad}</span>
                      </td>
                      <td className="telefono-info">
                        <a href={`tel:${colaborador.telefono}`} className="telefono-link">
                          {colaborador.telefono}
                        </a>
                      </td>
                      <td className="estado-info">
                        {colaborador.enVacaciones ? (
                          <span className="estado-badge moderno estado-vacaciones">
                            🏖️ Vacaciones
                          </span>
                        ) : (
                          <span className="estado-badge moderno estado-activo">
                            ✅ Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Nivel 3 */}
        <div className="nivel-section">
          <div 
            className="nivel-header moderno"
            style={{ 
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', 
              color: '#333' 
            }}
          >
            <div className="nivel-info">
              <span className="nivel-icon">🟩</span>
              <span className="nivel-nombre">3er NIVEL - ATENCIÓN FUERA DE HORARIO (FIJO)</span>
              <span className="nivel-contador">({turnosActuales.nivel3.length})</span>
            </div>
          </div>
          <div className="nivel-content">
            <div className="table-container responsivo">
              <table className="turnos-tabla moderna">
                <thead>
                  <tr>
                    <th>👤 Colaborador</th>
                    <th>🏢 Unidad</th>
                    <th>📞 Teléfono</th>
                    <th>📊 Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosActuales.nivel3.map((colaborador) => (
                    <tr key={colaborador.id} className="fila-colaborador">
                      <td className="colaborador-info">
                        <div className="colaborador-nombre">{colaborador.nombre}</div>
                      </td>
                      <td className="unidad-info">
                        <span className="unidad-badge">{colaborador.unidad}</span>
                      </td>
                      <td className="telefono-info">
                        <a href={`tel:${colaborador.telefono}`} className="telefono-link">
                          {colaborador.telefono}
                        </a>
                      </td>
                      <td className="estado-info">
                        {colaborador.enVacaciones ? (
                          <span className="estado-badge moderno estado-vacaciones">
                            🏖️ Vacaciones
                          </span>
                        ) : (
                          <span className="estado-badge moderno estado-fijo">
                            🔒 Fijo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
