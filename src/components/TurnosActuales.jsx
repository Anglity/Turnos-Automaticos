import { useState, useEffect, useRef } from 'react'
import { generarTurnosPorSemana, aplicarReemplazos, cargarColaboradores, cargarVacaciones } from '../services/turnosServiceFirebase'
import { obtenerLunesDelamSemana, obtenerDomingoDeLaSemana } from '../utils/fechas'
import html2canvas from 'html2canvas'

const TurnosActuales = () => {
  const [turnosActuales, setTurnosActuales] = useState(null)
  const [colaboradores, setColaboradores] = useState([])
  const [vacaciones, setVacaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [capturando, setCapturando] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar datos básicos
        const dataColaboradores = await cargarColaboradores()
        const dataVacaciones = await cargarVacaciones()
        setColaboradores(dataColaboradores)
        setVacaciones(dataVacaciones)

        // Generar turnos actuales usando la misma lógica del Dashboard
        const fechaActual = new Date()
        const turnos = await generarTurnosPorSemana(fechaActual)
        const lunes = obtenerLunesDelamSemana(fechaActual)
        const domingo = obtenerDomingoDeLaSemana(fechaActual)
  // Pasar la lista de colaboradores ya cargada para evitar reconsultas innecesarias
  const turnosConReemplazos = await aplicarReemplazos(turnos, lunes, domingo, colaboradores.length ? colaboradores : null)
        
        setTurnosActuales({
          ...turnosConReemplazos,
          fechaInicio: lunes,
          fechaFin: domingo
        })
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    };

    cargarDatos();
    
    // Escuchar cambios en localStorage para actualizar datos en tiempo real
    const handleStorageChange = () => {
      cargarDatos();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar un evento personalizado para cambios internos
    window.addEventListener('turnosDataChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('turnosDataChanged', handleStorageChange);
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

  const estaDeVacaciones = (colaboradorId) => {
    const hoy = new Date()
    return vacaciones.some(v => 
      v.colaboradorId === colaboradorId &&
      v.activo &&
      new Date(v.fechaInicio) <= hoy &&
      new Date(v.fechaFin) >= hoy
    )
  }

  const obtenerEstado = (colaborador) => {
    if (!colaborador.activo && !colaborador.esReemplazo) return { texto: 'Inactivo', clase: 'estado-inactivo', emoji: '❌' }
    if (colaborador.enVacaciones) return { texto: 'Vacaciones', clase: 'estado-vacaciones', emoji: '🏖️' }
    return { texto: 'Activo', clase: 'estado-activo', emoji: '✅' }
  }

  // Mapeo de descripciones por unidad (igual que Dashboard)
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

  // Preparar colaboradores con rotación aplicada para mostrar
  const prepararColaboradoresConRotacion = () => {
    if (!turnosActuales) return { colaboradoresPorNivel: {}, colaboradoresVacaciones: [] }

    let todosLosColaboradores = [
      ...turnosActuales.nivel1,
      ...turnosActuales.nivel2,
      ...turnosActuales.nivel3
    ]

    // Obtener colaboradores de vacaciones
    const colaboradoresVacaciones = colaboradores.filter(c => 
      c.activo && estaDeVacaciones(c.id)
    )

    // EXCLUIR colaboradores de vacaciones de los niveles activos
    todosLosColaboradores = todosLosColaboradores.filter(colaborador => 
      !estaDeVacaciones(colaborador.id)
    )

    // Aplicar lógica adicional de reemplazos por unidad para vacaciones
    todosLosColaboradores = todosLosColaboradores.map(colaborador => {
      // Buscar si hay alguien de su misma unidad de vacaciones en un nivel superior
      const colaboradorVacacionesMismaUnidad = colaboradoresVacaciones.find(cv => 
        cv.unidad === colaborador.unidad && 
        // Verificar nivel superior: si colaborador está en nivel 2, buscar vacaciones en nivel 1
        // Si colaborador está en nivel 3, buscar vacaciones en nivel 2
        ((turnosActuales.nivel2.find(c => c.id === colaborador.id) && 
          turnosActuales.nivel1.find(c => c.id === cv.id)) ||
         (turnosActuales.nivel3.find(c => c.id === colaborador.id) && 
          turnosActuales.nivel2.find(c => c.id === cv.id)))
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
      if (turnosActuales.nivel1.find(c => c.id === colaborador.id)) nivelActual = 1
      else if (turnosActuales.nivel2.find(c => c.id === colaborador.id)) nivelActual = 2
      else if (turnosActuales.nivel3.find(c => c.id === colaborador.id)) nivelActual = 3
      
      const coincideNivel = filtroNivel === 'todos' || nivelActual?.toString() === filtroNivel
      return coincideBusqueda && coincideNivel
    })

    // Agrupar por nivel actual (donde están asignados esta semana)
    const colaboradoresPorNivel = colaboradoresFiltrados.reduce((acc, colaborador) => {
      let nivel
      if (turnosActuales.nivel1.find(c => c.id === colaborador.id)) nivel = 1
      else if (turnosActuales.nivel2.find(c => c.id === colaborador.id)) nivel = 2
      else if (turnosActuales.nivel3.find(c => c.id === colaborador.id)) nivel = 3
      
      if (nivel) {
        if (!acc[nivel]) acc[nivel] = []
        acc[nivel].push(colaborador)
      }
      return acc
    }, {})

    return { colaboradoresPorNivel, colaboradoresVacaciones }
  }

  const { colaboradoresPorNivel, colaboradoresVacaciones } = prepararColaboradoresConRotacion()

  if (!turnosActuales) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-icon">⏳</div>
          <div>Cargando turnos actuales...</div>
        </div>
      </div>
    )
  }

  // Calcular estadísticas correctas - método más directo
  const hoy = new Date()
  
  // Obtener colaboradores activos de vacaciones directamente
  const colaboradoresEnVacaciones = colaboradores.filter(c => {
    if (!c.activo) return false
    return vacaciones.some(v => 
      v.colaboradorId === c.id &&
      v.activo &&
      new Date(v.fechaInicio) <= hoy &&
      new Date(v.fechaFin) >= hoy
    )
  })
  
  const totalGeneral = colaboradores.filter(c => c.activo).length
  const totalVacaciones = colaboradoresEnVacaciones.length
  const totalActivos = totalGeneral - totalVacaciones
  
  // Debug: verificar valores
  console.log('Debug estadísticas:', {
    totalGeneral,
    totalVacaciones: totalVacaciones,
    totalActivos,
    colaboradoresEnVacaciones: colaboradoresEnVacaciones.map(c => c.nombre)
  })

  const capturarImagen = async () => {
    // Buscar solo la sección de niveles para capturar
    const nivelesContainer = containerRef.current?.querySelector('.niveles-container')
    if (!nivelesContainer) return
    
    setCapturando(true)
    
    try {
      // Configuración para captura de alta calidad solo de los niveles
      const canvas = await html2canvas(nivelesContainer, {
        scale: 2, // Mayor resolución
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: nivelesContainer.scrollWidth,
        height: nivelesContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false
      })
      
      // Crear enlace de descarga
      const link = document.createElement('a')
      link.download = `turnos-niveles-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      
      // Disparar descarga
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error al capturar imagen:', error)
      alert('Error al generar la captura. Por favor, intenta nuevamente.')
    } finally {
      setCapturando(false)
    }
  }

  return (
    <div className="turnos-actuales-container" ref={containerRef}>
      {/* Header con estadísticas como Dashboard */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
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

      {/* Header con filtros */}
      <div className="turnos-header">
        <div className="turnos-title">
          <h1>📊 Turnos Actuales - Semana #{turnosActuales.numeroSemana}</h1>
          <div className="rotacion-info">
            <span className="rotacion-badge">Grupo {turnosActuales.grupoEnNivel1} en Nivel 1</span>
          </div>
        </div>
        
        {/* Filtros interactivos */}
        <div className="filtros-container">
          <div className="filtro-grupo">
            <input
              type="text"
              placeholder="🔍 Buscar colaborador o unidad..."
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
              disabled={capturando}
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

      {/* Resultados dinámicos */}
      {Object.keys(colaboradoresPorNivel).length === 0 ? (
        <div className="no-resultados">
          <div className="no-resultados-icon">🔍</div>
          <h3>No se encontraron colaboradores</h3>
          <p>Intenta con otros filtros de búsqueda</p>
        </div>
      ) : (
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
                <th className="table-header" style={{ textAlign: 'center' }}>👤 Colaborador</th>
                <th className="table-header" style={{ textAlign: 'center' }}>🏢 Unidad</th>
                <th className="table-header" style={{ textAlign: 'center' }}>📞 Teléfono</th>
                <th className="table-header" style={{ textAlign: 'center' }}>📅 Vacaciones</th>
                {/* Estado oculto */}
              </tr>
                    </thead>
                    <tbody>
                      {colaboradoresVacaciones.map(colaborador => {
                        const vacacionActual = vacaciones.find(v => 
                          v.colaboradorId === colaborador.id &&
                          v.activo &&
                          new Date(v.fechaInicio) <= new Date() &&
                          new Date(v.fechaFin) >= new Date()
                        )
                        const estado = obtenerEstado(colaborador)
                        
                        return (
                          <tr key={colaborador.id} className="fila-colaborador vacaciones-row">
                            <td className="colaborador-info">
                              <div className="colaborador-nombre">
                                {colaborador.nombre}
                                <div className="nivel-original">
                                  <small>Nivel original: {colaborador.nivelActual}</small>
                                </div>
                              </div>
                            </td>
                            <td className="unidad-info">{colaborador.unidad}</td>
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
                            {/* Estado oculto */}
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
                          <th className="table-header" style={{ textAlign: 'center' }}>👤 Colaborador</th>
                          <th className="table-header" style={{ textAlign: 'center' }}>🏢 Unidad</th>
                          <th className="table-header" style={{ textAlign: 'center' }}>📞 Teléfono</th>
                          {/* Para el primer nivel sustituimos Estado por Descripción; para otros niveles simplemente ocultamos Estado */}
                          {parseInt(nivel) === 1 ? (
                            <th className="table-header" style={{ textAlign: 'center' }}>Descripción</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {colaboradoresNivel.map(colaborador => {
                          const estado = obtenerEstado(colaborador)
                          return (
                            <tr key={colaborador.id} className="fila-colaborador">
                              <td className="colaborador-info">
                                <div className="colaborador-nombre">
                                  {colaborador.nombre}
                                  {/* Mostrar mensaje de reemplazo solo si NO es nivel 3 */}
                                  {parseInt(nivel) !== 3 && colaborador.esReemplazo && (
                                    <div className="reemplazo-indicator">
                                      <small>⬆️ Reemplazo de {colaborador.reemplazaA}</small>
                                    </div>
                                  )}
                                  {parseInt(nivel) !== 3 && colaborador.promocionPorVacaciones && (
                                    <div className="reemplazo-indicator">
                                      <small>⬆️ {colaborador.motivoPromocion}</small>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="unidad-info">{colaborador.unidad}</td>
                              <td className="telefono-info">
                                <a href={`tel:${colaborador.telefono}`} className="telefono-link">
                                  {colaborador.telefono}
                                </a>
                              </td>
                              {parseInt(nivel) === 1 ? (
                                <td className="descripcion-info" style={{ maxWidth: '320px', textAlign: 'left' }}>
                                  {cargarDescripcion(colaborador.unidad) || '—'}
                                </td>
                              ) : (
                                /* Estado oculto para niveles distintos */
                                null
                              )}
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
      )}

      {/* Footer con información de actualización */}
      <div className="turnos-footer">
        <div className="actualizacion-info">
          <span>🔄 Última actualización: {new Date().toLocaleString('es-ES')}</span>
          <button className="btn-actualizar" onClick={() => window.location.reload()}>
            ♻️ Actualizar
          </button>
        </div>
      </div>
    </div>
  )
}

export default TurnosActuales
