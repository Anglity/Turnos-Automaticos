import { useState, useEffect } from 'react'
import { Calendar, Users, Clock, Activity, Database, Trash2, Settings } from 'lucide-react'
import { generarTurnosPorSemana, aplicarReemplazos, cargarColaboradores, cargarVacaciones, limpiarVacacionesVencidas, limpiarColaboradoresInactivos, limpiarVacacionesHuerfanas, actualizarConfiguracionReferencia } from '../services/turnosServiceFirebase'
import { obtenerLunesDelamSemana, obtenerDomingoDeLaSemana, formatearRangoSemana } from '../utils/fechas'

const Dashboard = () => {
  const [turnosActuales, setTurnosActuales] = useState(null)
  const [fechaActual, setFechaActual] = useState(new Date())
  const [colaboradoresList, setColaboradoresList] = useState([])
  const [vacacionesList, setVacacionesList] = useState([])
  const [estadisticasBD, setEstadisticasBD] = useState({
    colaboradores: 0,
    vacaciones: 0,
    totalDocumentos: 0
  })
  const [limpiandoBD, setLimpiandoBD] = useState(false)
  const [actualizandoConfig, setActualizandoConfig] = useState(false)

  const actualizarConfiguracion = async () => {
    if (!confirm('¿Deseas actualizar la fecha de referencia para corregir el cálculo de semanas?\n\nEsto establecerá la fecha de referencia correcta para que hoy muestre "Semana #2".')) {
      return;
    }

    setActualizandoConfig(true);
    try {
      const exito = await actualizarConfiguracionReferencia();
      if (exito) {
        alert('✅ Configuración actualizada correctamente!\n\nEl cálculo de semanas ahora debería mostrar la semana correcta.');
        // Recargar turnos para ver el cambio
        await cargarTurnos();
      } else {
        alert('❌ Error al actualizar la configuración. Revisa la consola para más detalles.');
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      alert('❌ Error al actualizar la configuración. Revisa la consola para más detalles.');
    } finally {
      setActualizandoConfig(false);
    }
  }

  const cargarTurnos = async () => {
    try {
      const turnos = await generarTurnosPorSemana(fechaActual)
      const lunes = obtenerLunesDelamSemana(fechaActual)
      const domingo = obtenerDomingoDeLaSemana(fechaActual)
      const turnosConReemplazos = await aplicarReemplazos(turnos, lunes, domingo)
      
      setTurnosActuales({
        ...turnosConReemplazos,
        fechaInicio: lunes,
        fechaFin: domingo
      })
    } catch (error) {
      console.error('Error al cargar turnos:', error)
    }
  }

  const cargarEstadisticasBD = async () => {
    try {
      const colaboradores = await cargarColaboradores()
      const vacaciones = await cargarVacaciones()
      
      setColaboradoresList(colaboradores)
      setVacacionesList(vacaciones)
      
      setEstadisticasBD({
        colaboradores: colaboradores.length,
        vacaciones: vacaciones.length,
        totalDocumentos: colaboradores.length + vacaciones.length
      })
    } catch (error) {
      console.error('Error al cargar estadísticas BD:', error)
    }
  }

  const limpiarBaseDatos = async () => {
    if (!confirm('¿Deseas limpiar la base de datos? Esto eliminará:\n\n• Vacaciones vencidas hace más de 6 meses\n• Colaboradores inactivos sin vacaciones\n• Vacaciones huérfanas\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    setLimpiandoBD(true);
    try {
      const resultados = await Promise.all([
        limpiarVacacionesVencidas(),
        limpiarColaboradoresInactivos(), 
        limpiarVacacionesHuerfanas()
      ]);

      const totalEliminados = resultados.reduce((sum, result) => sum + (result.eliminados || 0), 0);
      
      alert(`✅ Base de datos limpiada exitosamente!\n\nSe eliminaron ${totalEliminados} registros obsoletos.\n\nLos datos se actualizarán automáticamente.`);
      
      // Recargar datos
      await cargarEstadisticasBD();
      await cargarTurnos();
    } catch (error) {
      console.error('Error al limpiar BD:', error);
      alert('❌ Error al limpiar la base de datos. Revisa la consola para más detalles.');
    } finally {
      setLimpiandoBD(false);
    }
  }

  useEffect(() => {
    cargarTurnos()
    cargarEstadisticasBD()
    
    // Escuchar cambios en los datos para actualizar el dashboard
    const handleDataChange = () => {
      cargarTurnos()
    }

    window.addEventListener('turnosDataChanged', handleDataChange)

    return () => {
      window.removeEventListener('turnosDataChanged', handleDataChange)
    }
  }, [fechaActual])

  if (!turnosActuales || colaboradoresList.length === 0 || vacacionesList.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <Activity size={32} />
          <p>Cargando datos del dashboard...</p>
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
  
  // Contar todos los colaboradores que están de vacaciones en esta semana
  const colaboradoresEnVacaciones = (colaboradoresList || []).filter(c => 
    c.activo && (vacacionesList || []).some(v => 
      v.colaboradorId === c.id &&
      v.activo &&
      new Date(v.fechaInicio) <= new Date(domingo) &&
      new Date(v.fechaFin) >= new Date(lunes)
    )
  )
  
  const totalVacaciones = colaboradoresEnVacaciones.length
  const totalActivos = todosLosColaboradores.filter(c => !c.enVacaciones && !c.esReemplazo).length + 
                      todosLosColaboradores.filter(c => c.esReemplazo).length
  const totalGeneral = (colaboradoresList || []).filter(c => c.activo).length

  // Mapeo de descripciones por unidad (según lo indicado)
  const cargarDescripcion = (unidad) => {
    switch ((unidad || '').trim()) {
      case 'Infraestructura & Cloud':
        return 'Para problemas con: plataforma, servidores, conectividad, o equipos de cómputo.'
      case 'Comunicaciones':
        return 'Para problemas con: red, flota, o telefonía fija.'
      case 'Gestión de Datos':
        return 'Para errores de sistema, bases de datos o recuperación de información.'
      default:
        return ''
    }
  }

  return (
    <div>
      {/* Título del Dashboard */}
      <div style={{ 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#495057', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          📊 Dashboard de Turnos
        </h1>
        <p style={{ 
          color: '#6c757d', 
          fontSize: '16px',
          margin: 0
        }}>
          Resumen general del sistema de gestión de turnos
        </p>
      </div>

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

        {/* Tarjeta Estadísticas BD (simplificada: solo botón 'Limpiar BD') */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <button 
              onClick={limpiarBaseDatos}
              disabled={limpiandoBD}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: limpiandoBD ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: limpiandoBD ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Trash2 size={14} />
              {limpiandoBD ? 'Limpiando...' : 'Limpiar BD'}
            </button>
          </div>
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
                    <th>Descripción</th>
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
                      <td className="descripcion-info" style={{ maxWidth: '320px', textAlign: 'left' }}>
                        {cargarDescripcion(colaborador.unidad) || '—'}
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
                      {/* Columna Estado oculta según petición */}
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
                      {/* Columna Estado oculta según petición */}
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
