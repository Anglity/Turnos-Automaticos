import { useState, useEffect, useRef } from 'react'
import { cargarColaboradores, cargarVacaciones, generarTurnos, generarTurnosPorSemana, aplicarReemplazos } from '../services/turnosServiceFirebase'
import { obtenerLunesDelamSemana, obtenerDomingoDeLaSemana, formatearRangoSemana, obtenerFechaHoyLocal } from '../utils/fechas'
import html2canvas from 'html2canvas'
import eventBus, { EVENTS } from '../utils/eventBus'

const GenerarTurnos = () => {
  const [colaboradores, setColaboradores] = useState([])
  const [vacaciones, setVacaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [fechaConsulta, setFechaConsulta] = useState('')
  const [turnosGenerados, setTurnosGenerados] = useState(null) // Cambiado a objeto para almacenar turnos
  const [capturando, setCapturando] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const dataColaboradores = await cargarColaboradores()
        const dataVacaciones = await cargarVacaciones()
        setColaboradores(dataColaboradores)
        setVacaciones(dataVacaciones)
        
        // Establecer fecha actual por defecto
        const fechaHoy = obtenerFechaHoyLocal()
        setFechaConsulta(fechaHoy)
        
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    };

    cargarDatos();

    // 🔄 Listeners para actualizaciones en tiempo real
    const unsubscribeColaboradores = eventBus.on(EVENTS.COLABORADORES_UPDATED, () => {
      cargarDatos();
    });

    const unsubscribeVacaciones = eventBus.on(EVENTS.VACACIONES_UPDATED, () => {
      cargarDatos();
    });

    return () => {
      unsubscribeColaboradores();
      unsubscribeVacaciones();
    };
  }, [])

  const obtenerNivelInfo = (nivel) => {
    const niveles = {
      1: { nombre: '1er NIVEL - ATENCIÓN FUERA DE HORARIO', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🟦' },
      2: { nombre: '2do NIVEL - ATENCIÓN FUERA DE HORARIO', color: 'linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%)', icon: '🟨' },
      3: { nombre: '3er NIVEL - ATENCIÓN FUERA DE HORARIO (FIJO)', color: 'linear-gradient(135deg, #81c784 0%, #66bb6a 100%)', icon: '🟩' }
    }
    return niveles[nivel] || { nombre: 'Sin nivel asignado', color: '#757575', icon: '⚫' }
  }

  const estaDeVacaciones = (colaboradorId, fechaEspecifica = null) => {
    const fechaConsultar = fechaEspecifica || new Date()
    return vacaciones.some(v => 
      v.colaboradorId === colaboradorId &&
      v.activo &&
      new Date(v.fechaInicio) <= fechaConsultar &&
      new Date(v.fechaFin) >= fechaConsultar
    )
  }

  const obtenerEstado = (colaborador, fechaEspecifica = null) => {
    if (!colaborador.activo && !colaborador.esReemplazo) return { texto: 'Inactivo', clase: 'estado-inactivo', emoji: '❌' }
    if (colaborador.enVacaciones) return { texto: 'Vacaciones', clase: 'estado-vacaciones', emoji: '🏖️' }
    return { texto: 'Activo', clase: 'estado-activo', emoji: '✅' }
  }

  const handleGenerarTurnos = async () => {
    if (!fechaConsulta) {
      alert('Por favor selecciona una fecha')
      return
    }

    try {
      // Validar que la fecha sea válida
      const fechaObj = new Date(fechaConsulta)
      if (isNaN(fechaObj.getTime())) {
        alert('Fecha inválida. Por favor selecciona una fecha válida.')
        return
      }

      // Generar turnos usando la rotación correcta
      const turnos = await generarTurnosPorSemana(fechaObj)
      const lunes = obtenerLunesDelamSemana(fechaObj)
      const domingo = obtenerDomingoDeLaSemana(fechaObj)
      const turnosConReemplazos = await aplicarReemplazos(turnos, lunes, domingo)
      
      setTurnosGenerados({
        ...turnosConReemplazos,
        fechaInicio: lunes,
        fechaFin: domingo,
        fechaConsulta: fechaObj
      })
      
    } catch (error) {
      console.error('Error al generar turnos:', error)
      alert('Error al generar los turnos')
    }
  }

  const handleFechaChange = (e) => {
    const nuevaFecha = e.target.value
    setFechaConsulta(nuevaFecha)
    
    // Si había turnos generados, reiniciarlos cuando cambie la fecha
    if (turnosGenerados) {
      setTurnosGenerados(null)
    }
  }

  const capturarImagen = async () => {
    const nivelesContainer = containerRef.current?.querySelector('.niveles-container')
    if (!nivelesContainer) return
    
    setCapturando(true)
    
    try {
      const canvas = await html2canvas(nivelesContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: nivelesContainer.scrollWidth,
        height: nivelesContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false
      })
      
      const link = document.createElement('a')
      link.download = `turnos-generados-${fechaConsulta}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error al capturar imagen:', error)
    } finally {
      setCapturando(false)
    }
  }

  // Reorganizar colaboradores según vacaciones para la fecha seleccionada
  const prepararColaboradoresConRotacion = () => {
    if (!turnosGenerados) return { colaboradoresPorNivel: {}, colaboradoresVacaciones: [] }

    let todosLosColaboradores = [
      ...turnosGenerados.nivel1,
      ...turnosGenerados.nivel2,
      ...turnosGenerados.nivel3
    ]

    // Obtener colaboradores de vacaciones para la fecha específica
    const fechaParaVacaciones = turnosGenerados.fechaConsulta || new Date()
    const colaboradoresVacaciones = colaboradores.filter(c => 
      c.activo && estaDeVacaciones(c.id, fechaParaVacaciones)
    )

    // EXCLUIR colaboradores de vacaciones de los niveles activos
    todosLosColaboradores = todosLosColaboradores.filter(colaborador => 
      !estaDeVacaciones(colaborador.id, fechaParaVacaciones)
    )

    // Aplicar lógica adicional de reemplazos por unidad para vacaciones
    todosLosColaboradores = todosLosColaboradores.map(colaborador => {
      // Buscar si hay alguien de su misma unidad de vacaciones en un nivel superior
      const colaboradorVacacionesMismaUnidad = colaboradoresVacaciones.find(cv => 
        cv.unidad === colaborador.unidad && 
        // Verificar nivel superior: si colaborador está en nivel 2, buscar vacaciones en nivel 1
        // Si colaborador está en nivel 3, buscar vacaciones en nivel 2
        ((turnosGenerados.nivel2.find(c => c.id === colaborador.id) && 
          turnosGenerados.nivel1.find(c => c.id === cv.id)) ||
         (turnosGenerados.nivel3.find(c => c.id === colaborador.id) && 
          turnosGenerados.nivel2.find(c => c.id === cv.id)))
      )

      if (colaboradorVacacionesMismaUnidad) {
        return {
          ...colaborador,
          promocionPorVacaciones: true,
          reemplazaA: colaboradorVacacionesMismaUnidad.nombre,
          motivoPromocion: `Reemplaza a ${colaboradorVacacionesMismaUnidad.nombre} (vacaciones)`
        }
      }
      
      return colaborador
    })

    // Filtrar colaboradores según búsqueda y nivel
    const colaboradoresFiltrados = todosLosColaboradores.filter(colaborador => {
      const coincideBusqueda = colaborador.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             colaborador.unidad.toLowerCase().includes(busqueda.toLowerCase())
      
      // Determinar nivel actual basado en el array donde está
      let nivelActual
      if (turnosGenerados.nivel1.find(c => c.id === colaborador.id)) nivelActual = 1
      else if (turnosGenerados.nivel2.find(c => c.id === colaborador.id)) nivelActual = 2
      else if (turnosGenerados.nivel3.find(c => c.id === colaborador.id)) nivelActual = 3
      
      const coincideNivel = filtroNivel === 'todos' || nivelActual?.toString() === filtroNivel
      return coincideBusqueda && coincideNivel
    })

    // Agrupar por nivel actual (donde están asignados esta semana)
    const colaboradoresPorNivel = colaboradoresFiltrados.reduce((acc, colaborador) => {
      let nivel
      if (turnosGenerados.nivel1.find(c => c.id === colaborador.id)) nivel = 1
      else if (turnosGenerados.nivel2.find(c => c.id === colaborador.id)) nivel = 2
      else if (turnosGenerados.nivel3.find(c => c.id === colaborador.id)) nivel = 3
      
      if (nivel) {
        if (!acc[nivel]) acc[nivel] = []
        acc[nivel].push(colaborador)
      }
      return acc
    }, {})

    return { colaboradoresPorNivel, colaboradoresVacaciones }
  }

  const { colaboradoresPorNivel, colaboradoresVacaciones } = prepararColaboradoresConRotacion()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-icon">⏳</div>
          <div>Cargando colaboradores...</div>
        </div>
      </div>
    )
  }

  const fechaSeleccionada = fechaConsulta ? (() => {
    try {
      const fecha = new Date(fechaConsulta + 'T12:00:00') // Usar mediodía para evitar problemas de zona horaria
      return isNaN(fecha.getTime()) ? null : fecha
    } catch {
      return null
    }
  })() : null
  
  // Calcular estadísticas correctamente basándose en turnos generados
  let totalActivos, totalVacaciones, totalGeneral
  
  if (turnosGenerados) {
    const todosLosColaboradoresActivos = [
      ...turnosGenerados.nivel1.filter(c => !estaDeVacaciones(c.id, turnosGenerados.fechaConsulta)),
      ...turnosGenerados.nivel2.filter(c => !estaDeVacaciones(c.id, turnosGenerados.fechaConsulta)),
      ...turnosGenerados.nivel3.filter(c => !estaDeVacaciones(c.id, turnosGenerados.fechaConsulta))
    ]
    totalActivos = todosLosColaboradoresActivos.length
    totalVacaciones = colaboradoresVacaciones.length
    totalGeneral = colaboradores.filter(c => c.activo).length
  } else {
    totalActivos = colaboradores.filter(c => c.activo).length
    totalVacaciones = 0
    totalGeneral = colaboradores.filter(c => c.activo).length
  }

  return (
    <div className="turnos-actuales-container" ref={containerRef}>
      {/* Estadísticas como Dashboard */}
      {turnosGenerados && (
        <div className="stats-grid" style={{ marginBottom: '30px' }}>
          {/* Tarjeta Semana Generada */}
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
              Semana Generada
            </h3>
            <p className="stat-value" style={{ 
              fontSize: '13px',
              lineHeight: 1.3,
              margin: '6px 0'
            }}>
              Semana #{turnosGenerados.numeroSemana}
            </p>
            <p className="stat-subtitle">
              Grupo {turnosGenerados.grupoEnNivel1} en Nivel 1
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
              Trabajando esta fecha
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
              Ausentes esta fecha
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
      )}

      {/* Header con generación de turnos */}
      <div className="turnos-header">
        <div className="turnos-title">
          <h1>📅 Generar Turnos</h1>
          {turnosGenerados && (
            <div className="rotacion-info">
              <span className="rotacion-badge">
                Semana #{turnosGenerados.numeroSemana} - Grupo {turnosGenerados.grupoEnNivel1} en Nivel 1
              </span>
              <div className="rango-semana">
                {formatearRangoSemana(turnosGenerados.fechaInicio, turnosGenerados.fechaFin)}
              </div>
            </div>
          )}
        </div>
        
        {/* Controles de fecha y filtros */}
        <div className="filtros-container">
          <div className="filtro-grupo">
            <label htmlFor="fecha-selector" className="filtro-label">📅 Seleccionar Fecha:</label>
            <div className="fecha-input-container">
              <input
                id="fecha-selector"
                type="date"
                value={fechaConsulta}
                onChange={handleFechaChange}
                className="filtro-fecha-grande"
              />
              <button
                type="button"
                onClick={() => {
                  const hoy = obtenerFechaHoyLocal()
                  setFechaConsulta(hoy)
                  setTurnosGenerados(null)
                }}
                className="btn-hoy"
              >
                Hoy
              </button>
            </div>
          </div>
          
          <div className="filtro-grupo">
            <button
              onClick={handleGenerarTurnos}
              disabled={!fechaConsulta}
              className="btn-generar"
            >
              📅 Generar Turnos
            </button>
          </div>

          <div className="filtro-grupo">
            <input
              type="text"
              placeholder="🔍 Buscar colaborador..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="filtro-busqueda"
            />
          </div>
          
          <div className="filtro-grupo">
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="filtro-nivel"
            >
              <option value="todos">📋 Todos los niveles</option>
              <option value="1">🟦 1er Nivel</option>
              <option value="2">🟨 2do Nivel</option>
              <option value="3">🟩 3er Nivel</option>
            </select>
          </div>
          
          <div className="filtro-grupo">
            <button
              onClick={capturarImagen}
              disabled={capturando || !turnosGenerados}
              className="btn-captura"
            >
              {capturando ? (
                <>⏳ Capturando...</>
              ) : (
                <>📸 Exportar Imagen</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Información de fecha seleccionada */}
      {fechaSeleccionada && (
        <div className="fecha-info">
          <div className="fecha-badge">
            📅 Turnos para: {fechaSeleccionada.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          {turnosGenerados && (
            <div className="estado-generacion">
              ✅ Turnos generados correctamente
            </div>
          )}
        </div>
      )}

      {/* Mensaje si no se ha generado */}
      {!turnosGenerados && fechaSeleccionada && (
        <div className="mensaje-generar">
          <div className="mensaje-icon">📅</div>
          <h3>Haz clic en "Generar Turnos" para ver los turnos de esta fecha</h3>
          <p>Se mostrarán los colaboradores activos para el {fechaSeleccionada.toLocaleDateString('es-ES')}</p>
        </div>
      )}

      {/* Resultados dinámicos */}
      {turnosGenerados && Object.keys(colaboradoresPorNivel).length === 0 ? (
        <div className="no-resultados">
          <div className="no-resultados-icon">🔍</div>
          <h3>No se encontraron colaboradores</h3>
          <p>Ajusta los filtros de búsqueda</p>
        </div>
      ) : turnosGenerados ? (
        /* Contenedor específico para captura solo de niveles */
        <div className="niveles-container">
          {/* Tabla especial para colaboradores de vacaciones */}
          {colaboradoresVacaciones.length > 0 && (
            <div className="nivel-section vacaciones-section">
              <div 
                className="nivel-header vacaciones-header"
                style={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }}
              >
                <div className="nivel-info">
                  <span className="nivel-icon">🏖️</span>
                  <span className="nivel-nombre">COLABORADORES DE VACACIONES</span>
                  <span className="nivel-contador">({colaboradoresVacaciones.length})</span>
                </div>
              </div>
              
              <div className="nivel-content">
                <div className="table-container responsivo">
                  <table className="turnos-tabla moderna">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>👤 Colaborador</th>
                        <th style={{ textAlign: 'center' }}>🏢 Unidad</th>
                        <th style={{ textAlign: 'center' }}>📞 Teléfono</th>
                        <th style={{ textAlign: 'center' }}>📅 Vacaciones</th>
                        <th style={{ textAlign: 'center' }}>📊 Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colaboradoresVacaciones.map(colaborador => {
                        const fechaParaVacaciones = turnosGenerados.fechaConsulta || new Date()
                        
                        const vacacionActual = vacaciones.find(v => 
                          v.colaboradorId === colaborador.id &&
                          v.activo &&
                          new Date(v.fechaInicio) <= fechaParaVacaciones &&
                          new Date(v.fechaFin) >= fechaParaVacaciones
                        )
                        
                        // Crear colaborador con estado de vacaciones actualizado
                        const colaboradorConEstado = {
                          ...colaborador,
                          enVacaciones: !!vacacionActual
                        }
                        
                        const estado = obtenerEstado(colaboradorConEstado, fechaParaVacaciones)
                        
                        return (
                          <tr key={colaborador.id} className="fila-colaborador vacaciones-row">
                            <td className="colaborador-info">
                              <div className="colaborador-nombre">
                                {colaborador.nombre}
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
                            <td className="periodo-vacaciones">
                              {vacacionActual && (
                                <div className="periodo-info">
                                  <div>{new Date(vacacionActual.fechaInicio).toLocaleDateString('es-ES')}</div>
                                  <div>hasta</div>
                                  <div>{new Date(vacacionActual.fechaFin).toLocaleDateString('es-ES')}</div>
                                </div>
                              )}
                            </td>
                            <td className="estado-info">
                              <span className={`estado-badge moderno ${estado.clase}`}>
                                {estado.emoji} {estado.texto}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Mostrar niveles filtrados */}
          {Object.keys(colaboradoresPorNivel)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(nivel => {
              const nivelInfo = obtenerNivelInfo(parseInt(nivel))
              const colaboradoresNivel = colaboradoresPorNivel[nivel]

              return (
                <div key={nivel} className="nivel-section activo">
                  <div 
                    className="nivel-header moderno"
                    style={{ background: nivelInfo.color }}
                  >
                    <div className="nivel-info">
                      <span className="nivel-icon">{nivelInfo.icon}</span>
                      <span className="nivel-nombre">{nivelInfo.nombre}</span>
                      <span className="nivel-contador">({colaboradoresNivel.length})</span>
                    </div>
                  </div>
                  
                  <div className="nivel-content">
                    <div className="table-container responsivo">
                      <table className="turnos-tabla moderna">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>👤 Colaborador</th>
                            <th style={{ textAlign: 'center' }}>🏢 Unidad</th>
                            <th style={{ textAlign: 'center' }}>📞 Teléfono</th>
                            <th style={{ textAlign: 'center' }}>📊 Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {colaboradoresNivel.map(colaborador => {
                            const estado = obtenerEstado(colaborador, turnosGenerados.fechaConsulta)
                            return (
                              <tr key={colaborador.id} className="fila-colaborador">
                                <td className="colaborador-info">
                                  <div className="colaborador-nombre">
                                    {colaborador.nombre}
                                    {colaborador.esReemplazo && (
                                      <div className="reemplazo-indicator">
                                        <small>⬆️ Reemplazo de {colaborador.reemplazaA}</small>
                                      </div>
                                    )}
                                    {colaborador.promocionPorVacaciones && (
                                      <div className="reemplazo-indicator">
                                        <small>⬆️ {colaborador.motivoPromocion}</small>
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
                                  <span className={`estado-badge moderno ${estado.clase}`}>
                                    {estado.emoji} {estado.texto}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      ) : null}

      {/* Footer con información */}
      <div className="turnos-footer">
        <div className="actualizacion-info">
          <span>🔄 Última actualización: {new Date().toLocaleString('es-ES')}</span>
          {fechaConsulta && (
            <span>📅 Fecha seleccionada: {fechaConsulta}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default GenerarTurnos
