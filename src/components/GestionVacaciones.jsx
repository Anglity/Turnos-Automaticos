import { useState, useEffect } from 'react'
import { Plus, Calendar, User, Edit3, Plane } from 'lucide-react'
import { 
  cargarColaboradores, 
  cargarVacaciones, 
  guardarVacaciones,
  actualizarVacaciones,
  eliminarVacaciones
} from '../services/turnosServiceFirebase'
import eventBus, { EVENTS } from '../utils/eventBus'

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
    const cargarDatos = async () => {
      try {
        const dataColaboradores = (await cargarColaboradores()).filter(c => c.activo);
        const dataVacaciones = await cargarVacaciones();
        setColaboradores(dataColaboradores);
        setVacaciones(dataVacaciones);
      } catch (error) {
        console.error('Error al cargar datos:', error);
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
  }, []);

  const abrirFormulario = (vacacionParaEditar = null) => {
    if (vacacionParaEditar) {
      setModoEdicion(true);
      setVacacionesEditando(vacacionParaEditar);
      setNuevasVacaciones({
        colaboradorId: vacacionParaEditar.colaboradorId.toString(),
        fechaInicio: fechaToString(vacacionParaEditar.fechaInicio),
        fechaFin: fechaToString(vacacionParaEditar.fechaFin),
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
    
    // Validaciones
    if (!nuevasVacaciones.colaboradorId) {
      alert('Por favor selecciona un colaborador');
      return;
    }
    
    if (!nuevasVacaciones.fechaInicio) {
      alert('Por favor selecciona una fecha de inicio');
      return;
    }
    
    if (!nuevasVacaciones.fechaFin) {
      alert('Por favor selecciona una fecha de fin');
      return;
    }
    
    // Validar que la fecha de fin sea posterior a la fecha de inicio usando fechas locales
    const [yearInicio, monthInicio, dayInicio] = nuevasVacaciones.fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = nuevasVacaciones.fechaFin.split('-');
    const fechaInicio = new Date(yearInicio, monthInicio - 1, dayInicio);
    const fechaFin = new Date(yearFin, monthFin - 1, dayFin);
    
    if (fechaInicio >= fechaFin) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    try {
      if (modoEdicion) {
        // Editar vacaciones existentes
        const vacacionesActualizadas = {
          ...vacacionesEditando,
          ...nuevasVacaciones,
          colaboradorId: nuevasVacaciones.colaboradorId // Mantener como string
        };

        const resultado = await actualizarVacaciones(vacacionesEditando.id, vacacionesActualizadas);
        if (resultado) {
          setVacaciones(prev => 
            prev.map(v => v.id === vacacionesEditando.id ? resultado : v)
          );
        }
      } else {
        // Agregar nuevas vacaciones
        const vacacionesData = {
          ...nuevasVacaciones,
          colaboradorId: nuevasVacaciones.colaboradorId, // Mantener como string
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
          await actualizarVacaciones(vacacionId, vacacionCancelada);
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

  // Helper para convertir fecha a string formato YYYY-MM-DD sin importar el tipo
  const fechaToString = (fecha) => {
    if (!fecha) return '';
    
    // Si ya es un string en formato correcto, devolverlo tal como está
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    
    // Si es un objeto Date o Timestamp de Firebase (fallback para datos existentes)
    let fechaObj;
    if (fecha.toDate && typeof fecha.toDate === 'function') {
      // Timestamp de Firebase
      fechaObj = fecha.toDate();
    } else if (fecha instanceof Date) {
      // Objeto Date
      fechaObj = fecha;
    } else if (typeof fecha === 'string') {
      // String que no está en formato correcto
      fechaObj = new Date(fecha);
    } else {
      // Fallback
      fechaObj = new Date(fecha);
    }
    
    // Convertir a formato YYYY-MM-DD usando fechas locales
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calcularDias = (fechaInicio, fechaFin) => {
    // Contar solo días laborables (lunes-viernes), inclusivo
    const fechaInicioStr = fechaToString(fechaInicio);
    const fechaFinStr = fechaToString(fechaFin);

    if (!fechaInicioStr || !fechaFinStr) return 0;

    const [yearInicio, monthInicio, dayInicio] = fechaInicioStr.split('-');
    const [yearFin, monthFin, dayFin] = fechaFinStr.split('-');
    let inicio = new Date(yearInicio, monthInicio - 1, dayInicio);
    let fin = new Date(yearFin, monthFin - 1, dayFin);

    // Si la fecha fin es anterior a la de inicio, devolver 0
    if (fin < inicio) return 0;

    let contador = 0;
    const fechaActual = new Date(inicio);
    while (fechaActual <= fin) {
      const dia = fechaActual.getDay(); // 0 = domingo, 6 = sábado
      if (dia !== 0 && dia !== 6) contador++;
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    return contador;
  }

  const formatearFecha = (fecha) => {
    // Convertir fecha a string primero
    const fechaStr = fechaToString(fecha);
    if (!fechaStr) return '';
    
    // Crear fecha local para evitar problemas de timezone
    const [year, month, day] = fechaStr.split('-');
    const fechaLocal = new Date(year, month - 1, day);
    return fechaLocal.toLocaleDateString('es-ES')
  }

  const esVacacionActiva = (vacacion) => {
    const hoy = new Date()
    
    // Convertir fechas a string primero
    const fechaInicioStr = fechaToString(vacacion.fechaInicio);
    const fechaFinStr = fechaToString(vacacion.fechaFin);
    
    if (!fechaInicioStr || !fechaFinStr) return false;
    
    // Crear fechas locales para evitar problemas de timezone
    const [yearInicio, monthInicio, dayInicio] = fechaInicioStr.split('-');
    const [yearFin, monthFin, dayFin] = fechaFinStr.split('-');
    const inicio = new Date(yearInicio, monthInicio - 1, dayInicio)
    const fin = new Date(yearFin, monthFin - 1, dayFin)
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
                <th className="table-header">👤 Colaborador</th>
                <th className="table-header">🏢 Unidad</th>
                <th className="table-header">📅 Fecha Inicio</th>
                <th className="table-header">📅 Fecha Fin</th>
                <th className="table-header">Días</th>
                <th className="table-header">Motivo</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
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
