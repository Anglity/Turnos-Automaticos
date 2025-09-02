import { useState, useEffect } from 'react'
import { Plane, Plus, Calendar, User, Edit3 } from 'lucide-react'
import { 
  cargarColaboradores, 
  cargarVacaciones, 
  guardarVacaciones,
  actualizarVacaciones,
  eliminarVacaciones
} from '../services/turnosService'

const GestionVacaciones = () => {
  const [colaboradores, setColaboradores] = useState([])
  const [vacaciones, setVacaciones] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [vacacionesEditando, setVacacionesEditando] = useState(null)
  const [nuevasVacaciones, setNuevasVacaciones] = useState({
    colaboradorId: '',
    fechaInicio: '',
    fechaFin: '',
    motivo: ''
  })

  // Cargar datos al montar el componente
  useEffect(() => {
    const cargarDatos = () => {
      try {
        const dataColaboradores = cargarColaboradores().filter(c => c.activo);
        const dataVacaciones = cargarVacaciones();
        setColaboradores(dataColaboradores);
        setVacaciones(dataVacaciones);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };

    cargarDatos();
    
    // Escuchar cambios en los datos SOLO de otros componentes
    const handleDataChange = (event) => {
      // Evitar recargar si el cambio viene de este componente
      if (event.detail?.source !== 'GestionVacaciones') {
        cargarDatos();
      }
    };

    window.addEventListener('turnosDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('turnosDataChanged', handleDataChange);
    };
  }, []);

  const abrirFormulario = (vacacionParaEditar = null) => {
    if (vacacionParaEditar) {
      setModoEdicion(true);
      setVacacionesEditando(vacacionParaEditar);
      setNuevasVacaciones({
        colaboradorId: vacacionParaEditar.colaboradorId.toString(),
        fechaInicio: vacacionParaEditar.fechaInicio,
        fechaFin: vacacionParaEditar.fechaFin,
        motivo: vacacionParaEditar.motivo
      });
    } else {
      setModoEdicion(false);
      setVacacionesEditando(null);
      setNuevasVacaciones({
        colaboradorId: '',
        fechaInicio: '',
        fechaFin: '',
        motivo: ''
      });
    }
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setModoEdicion(false);
    setVacacionesEditando(null);
    setNuevasVacaciones({
      colaboradorId: '',
      fechaInicio: '',
      fechaFin: '',
      motivo: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (new Date(nuevasVacaciones.fechaInicio) >= new Date(nuevasVacaciones.fechaFin)) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    try {
      if (modoEdicion) {
        // Editar vacaciones existentes
        const vacacionesActualizadas = {
          ...vacacionesEditando,
          ...nuevasVacaciones,
          colaboradorId: parseInt(nuevasVacaciones.colaboradorId)
        };

        const resultado = await actualizarVacaciones(vacacionesActualizadas);
        if (resultado) {
          setVacaciones(prev => 
            prev.map(v => v.id === vacacionesEditando.id ? resultado : v)
          );
        }
      } else {
        // Agregar nuevas vacaciones
        const vacacionesData = {
          ...nuevasVacaciones,
          colaboradorId: parseInt(nuevasVacaciones.colaboradorId),
          activo: true
        };

        const vacacionesGuardadas = await guardarVacaciones(vacacionesData);
        setVacaciones(prev => [...prev, vacacionesGuardadas]);
      }
      
      cerrarFormulario();
    } catch (error) {
      console.error('Error al guardar vacaciones:', error);
      alert('Error al guardar las vacaciones. Intenta nuevamente.');
    }
  }

  const handleEliminar = async (vacacionId) => {
    if (window.confirm('¿Deseas cancelar estas vacaciones?')) {
      try {
        // Opción 1: Marcar como inactivo (cancelar)
        const vacacionActualizada = vacaciones.find(v => v.id === vacacionId);
        if (vacacionActualizada) {
          const vacacionCancelada = { ...vacacionActualizada, activo: false };
          await actualizarVacaciones(vacacionCancelada);
          setVacaciones(prev => 
            prev.map(v => v.id === vacacionId ? vacacionCancelada : v)
          );
        }
        
        // Opción 2: Eliminar completamente (descomenta si prefieres eliminar)
        // await eliminarVacaciones(vacacionId);
        // setVacaciones(prev => prev.filter(v => v.id !== vacacionId));
      } catch (error) {
        console.error('Error al cancelar vacaciones:', error);
        alert('Error al cancelar las vacaciones. Intenta nuevamente.');
      }
    }
  }

  const vacacionesActivas = vacaciones.filter(v => v.activo)
  const vacacionesConColaborador = vacacionesActivas.map(v => ({
    ...v,
    colaborador: colaboradores.find(c => c.id === v.colaboradorId)
  }))

  const calcularDias = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const diferencia = fin - inicio
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1
  }

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES')
  }

  const esVacacionActiva = (vacacion) => {
    const hoy = new Date()
    const inicio = new Date(vacacion.fechaInicio)
    const fin = new Date(vacacion.fechaFin)
    return hoy >= inicio && hoy <= fin
  }

  return (
    <div className="gestion-vacaciones">
      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h2 style={{ color: '#495057', display: 'flex', alignItems: 'center' }}>
            <Plane size={24} style={{ marginRight: '8px' }} />
            Gestión de Vacaciones
          </h2>
          <button
            onClick={() => abrirFormulario()}
            className="btn"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Plus size={16} style={{ marginRight: '5px' }} />
            Programar Vacaciones
          </button>
        </div>

        {/* Estadísticas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
            color: 'white', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center' 
          }}>
            <h3 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>
              {vacacionesConColaborador.filter(v => esVacacionActiva(v)).length}
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>En vacaciones hoy</p>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center' 
          }}>
            <h3 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>
              {vacacionesConColaborador.length}
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Total programadas</p>
          </div>
        </div>

        {/* Lista de vacaciones */}
        {vacacionesConColaborador.length > 0 ? (
          <table className="turnos-tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Unidad</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Días</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vacacionesConColaborador.map((vacacion) => (
                <tr key={vacacion.id} style={{
                  background: esVacacionActiva(vacacion) ? '#fff8e1' : 'transparent'
                }}>
                  <td style={{ whiteSpace: 'nowrap' }}>{vacacion.colaborador?.nombre}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{vacacion.colaborador?.unidad}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatearFecha(vacacion.fechaInicio)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatearFecha(vacacion.fechaFin)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="dias-badge">
                      {calcularDias(vacacion.fechaInicio, vacacion.fechaFin)}d
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {vacacion.motivo || 'N/A'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {esVacacionActiva(vacacion) ? (
                      <span className="estado-activo" style={{ fontSize: '12px' }}>
                        🏖️ Vacaciones
                      </span>
                    ) : new Date(vacacion.fechaInicio) > new Date() ? (
                      <span className="estado-programado" style={{ fontSize: '12px' }}>
                        ⏳ Programado
                      </span>
                    ) : (
                      <span className="estado-finalizado" style={{ fontSize: '12px' }}>
                        ✅ Finalizado
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="acciones-vacaciones" style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => abrirFormulario(vacacion)}
                        className="btn-editar-vacacion"
                        title="Editar vacaciones"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleEliminar(vacacion.id)}
                        className="btn-cancelar-vacacion"
                        title="Cancelar vacaciones"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#6c757d' 
          }}>
            <Plane size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
            <h3>No hay vacaciones programadas</h3>
            <p>Utiliza el botón "Programar Vacaciones" para agregar nuevas ausencias</p>
          </div>
        )}
      </div>

      {/* Modal/Formulario */}
      {mostrarFormulario && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '500px', 
            margin: 0,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
              <Calendar size={20} style={{ marginRight: '8px' }} />
              {modoEdicion ? 'Editar Vacaciones' : 'Programar Vacaciones'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <User size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  Colaborador:
                </label>
                <select
                  className="form-control"
                  value={nuevasVacaciones.colaboradorId}
                  onChange={(e) => setNuevasVacaciones(prev => ({ ...prev, colaboradorId: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar colaborador...</option>
                  {colaboradores.map(colaborador => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nombre} - {colaborador.unidad}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha de Inicio:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={nuevasVacaciones.fechaInicio}
                    onChange={(e) => setNuevasVacaciones(prev => ({ ...prev, fechaInicio: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Fin:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={nuevasVacaciones.fechaFin}
                    onChange={(e) => setNuevasVacaciones(prev => ({ ...prev, fechaFin: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {nuevasVacaciones.fechaInicio && nuevasVacaciones.fechaFin && (
                <div style={{ 
                  background: '#e9f4ff', 
                  padding: '10px', 
                  borderRadius: '6px', 
                  marginBottom: '15px',
                  fontSize: '14px',
                  color: '#0066cc'
                }}>
                  📅 Duración: {calcularDias(nuevasVacaciones.fechaInicio, nuevasVacaciones.fechaFin)} días
                </div>
              )}

              <div className="form-group">
                <label>Motivo (opcional):</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={nuevasVacaciones.motivo}
                  onChange={(e) => setNuevasVacaciones(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Vacaciones anuales, permiso personal, etc."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  {modoEdicion ? 'Actualizar Vacaciones' : 'Programar Vacaciones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionVacaciones
