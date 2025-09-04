import React, { useState, useEffect, useRef } from 'react';
import { 
  cargarColaboradores, 
  cargarVacaciones, 
  guardarColaborador as guardarColaboradorService,
  actualizarColaborador,
  eliminarColaborador as eliminarColaboradorService,
  inicializarDatos
} from '../services/turnosServiceFirebase';
import { User, Phone, Building2, Users, UserPlus, Edit3, Trash2, Download, Search, Filter, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';
import eventBus, { EVENTS } from '../utils/eventBus';

const GestionColaboradores = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradoresOriginales, setColaboradoresOriginales] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState(null);
  const [capturando, setCapturando] = useState(false);
  const containerRef = useRef(null);
  
  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Formulario
  const [formulario, setFormulario] = useState({
    nombre: '',
    unidad: '',
    telefono: '',
    grupoRotacion: 'A',
    nivelActual: 1,
    activo: true
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const dataColaboradores = await cargarColaboradores();
        const dataVacaciones = await cargarVacaciones();
        setColaboradores(dataColaboradores || []);
        setColaboradoresOriginales(dataColaboradores || []);
        setVacaciones(dataVacaciones || []);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        // En caso de error, asegurar que los estados sean arrays vacíos
        setColaboradores([]);
        setColaboradoresOriginales([]);
        setVacaciones([]);
      } finally {
        setLoading(false);
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

  const estaDeVacaciones = (colaboradorId) => {
    const hoy = new Date();
    return (vacaciones || []).some(v => 
      v.colaboradorId === colaboradorId &&
      v.activo &&
      new Date(v.fechaInicio) <= hoy &&
      new Date(v.fechaFin) >= hoy
    );
  };

  // Filtrar colaboradores (con protección para arrays)
  const colaboradoresFiltrados = (colaboradores || []).filter(colaborador => {
    const nombreMatch = colaborador.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const unidadMatch = filtroUnidad === '' || colaborador.unidad.toLowerCase().includes(filtroUnidad.toLowerCase());
    const estadoMatch = filtroEstado === 'todos' || 
      (filtroEstado === 'activos' && colaborador.activo) ||
      (filtroEstado === 'inactivos' && !colaborador.activo) ||
      (filtroEstado === 'vacaciones' && estaDeVacaciones(colaborador.id));
    
    return nombreMatch && unidadMatch && estadoMatch;
  });

  // Funciones del modal
  const abrirModal = (colaborador = null) => {
    if (colaborador) {
      setModoEdicion(true);
      setColaboradorEditando(colaborador);
      setFormulario({
        nombre: colaborador.nombre,
        unidad: colaborador.unidad,
        telefono: colaborador.telefono,
        grupoRotacion: colaborador.grupoRotacion,
        nivelActual: colaborador.nivelActual,
        activo: colaborador.activo
      });
    } else {
      setModoEdicion(false);
      setColaboradorEditando(null);
      setFormulario({
        nombre: '',
        unidad: '',
        telefono: '',
        grupoRotacion: 'A',
        nivelActual: 1,
        activo: true
      });
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setModoEdicion(false);
    setColaboradorEditando(null);
    setFormulario({
      nombre: '',
      unidad: '',
      telefono: '',
      grupoRotacion: 'A',
      nivelActual: 1,
      activo: true
    });
  };

  const guardarColaborador = async () => {
    if (!formulario.nombre.trim() || !formulario.unidad.trim() || !formulario.telefono.trim()) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    try {
      if (modoEdicion) {
        // Editar colaborador existente
        const colaboradorActualizado = await actualizarColaborador({
          ...formulario,
          id: colaboradorEditando.id
        });
        
        if (colaboradorActualizado) {
          setColaboradores(prev => 
            prev.map(c => c.id === colaboradorEditando.id ? colaboradorActualizado : c)
          );
          setColaboradoresOriginales(prev => 
            prev.map(c => c.id === colaboradorEditando.id ? colaboradorActualizado : c)
          );
        }
      } else {
        // Agregar nuevo colaborador
        const nuevoColaborador = await guardarColaboradorService(formulario);
        setColaboradores(prev => [...prev, nuevoColaborador]);
        setColaboradoresOriginales(prev => [...prev, nuevoColaborador]);
      }
      
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar colaborador:', error);
      alert('Error al guardar el colaborador. Intenta nuevamente.');
    }
  };

  const eliminarColaborador = async (colaborador) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${colaborador.nombre}?`)) {
      try {
        const eliminado = await eliminarColaboradorService(colaborador.id);
        
        if (eliminado) {
          setColaboradores(prev => prev.filter(c => c.id !== colaborador.id));
          setColaboradoresOriginales(prev => prev.filter(c => c.id !== colaborador.id));
          // También actualizar las vacaciones para remover las del colaborador eliminado
          setVacaciones(prev => prev.filter(v => v.colaboradorId !== colaborador.id));
        }
      } catch (error) {
        console.error('Error al eliminar colaborador:', error);
        alert('Error al eliminar el colaborador. Intenta nuevamente.');
      }
    }
  };

  const restaurarDatos = async () => {
    if (window.confirm('¿Estás seguro de que deseas restaurar todos los datos a su estado original? Se perderán todos los cambios realizados.')) {
      try {
        const datosRestaurados = await restaurarDatosOriginales();
        setColaboradores(datosRestaurados.colaboradores);
        setColaboradoresOriginales(datosRestaurados.colaboradores);
        setVacaciones(datosRestaurados.vacaciones);
        alert('Datos restaurados correctamente');
      } catch (error) {
        console.error('Error al restaurar datos:', error);
        alert('Error al restaurar los datos. Intenta nuevamente.');
      }
    }
  };

  // Función para exportar backup
  const exportarBackup = () => {
    try {
      exportarDatos();
      alert('🎉 Backup exportado exitosamente!\n\nEl archivo se ha descargado y contiene todos tus datos.\nGuárdalo en un lugar seguro.');
    } catch (error) {
      console.error('Error al exportar backup:', error);
      alert('Error al exportar el backup. Intenta nuevamente.');
    }
  };

  // Función para importar backup
  const importarBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;
      
      try {
        await importarDatos(archivo);
        // Recargar datos después de importar
        const colaboradoresActualizados = cargarColaboradores();
        const vacacionesActualizadas = cargarVacaciones();
        
        setColaboradores(colaboradoresActualizados);
        setColaboradoresOriginales(colaboradoresActualizados);
        setVacaciones(vacacionesActualizadas);
        
        alert('🎉 Backup importado exitosamente!\n\nTodos los datos han sido restaurados desde el archivo.');
      } catch (error) {
        console.error('Error al importar backup:', error);
        alert('❌ Error al importar el backup.\n\nVerifica que el archivo sea válido y vuelve a intentar.');
      }
    };
    
    input.click();
  };

  // Función de captura
  const capturarTabla = async () => {
    if (!containerRef.current) return;
    
    setCapturando(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colaboradores_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error al capturar tabla:', error);
      alert('Error al exportar la tabla');
    } finally {
      setCapturando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroNombre('');
    setFiltroUnidad('');
    setFiltroEstado('todos');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <Users size={48} />
        </div>
        <p>Cargando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="gestion-colaboradores-moderna">
      {/* Header */}
      <div className="colaboradores-header">
        <div className="header-title">
          <h1>
            <Users size={28} className="header-icon" />
            Gestión de Colaboradores
          </h1>
          <p>Administra la información del personal y sus asignaciones</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-moderno btn-restaurar" 
            onClick={restaurarDatos}
            title="Restaurar datos originales"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
              color: 'white',
              marginRight: '8px'
            }}
          >
            <RotateCcw size={16} />
            Restaurar
          </button>
          <button 
            className="btn-moderno btn-exportar" 
            onClick={capturarTabla}
            disabled={capturando}
          >
            <Download size={18} />
            {capturando ? 'Exportando...' : 'Exportar'}
          </button>
          <button 
            className="btn-moderno btn-agregar" 
            onClick={() => abrirModal()}
          >
            <UserPlus size={18} />
            Agregar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="colaboradores-stats-moderna">
        <div className="stat-card-moderna total">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total</h3>
            <p>{colaboradores.length}</p>
          </div>
        </div>
        <div className="stat-card-moderna activos">
          <div className="stat-icon">
            <User size={24} />
          </div>
          <div className="stat-content">
            <h3>Activos</h3>
            <p>{colaboradores.filter(c => c.activo && !estaDeVacaciones(c.id)).length}</p>
          </div>
        </div>
        <div className="stat-card-moderna vacaciones">
          <div className="stat-icon">
            🏖️
          </div>
          <div className="stat-content">
            <h3>De Vacaciones</h3>
            <p>{colaboradores.filter(c => estaDeVacaciones(c.id)).length}</p>
          </div>
        </div>
        <div className="stat-card-moderna inactivos">
          <div className="stat-icon">
            ⏸️
          </div>
          <div className="stat-content">
            <h3>Inactivos</h3>
            <p>{colaboradores.filter(c => !c.activo).length}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-colaboradores">
        <div className="filtros-row">
          <div className="filtro-group">
            <label>
              <Search size={16} />
              Buscar por nombre
            </label>
            <input
              type="text"
              placeholder="Escribe el nombre..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              className="input-filtro"
            />
          </div>
          
          <div className="filtro-group">
            <label>
              <Building2 size={16} />
              Filtrar por unidad
            </label>
            <input
              type="text"
              placeholder="Escribe la unidad..."
              value={filtroUnidad}
              onChange={(e) => setFiltroUnidad(e.target.value)}
              className="input-filtro"
            />
          </div>
          
          <div className="filtro-group">
            <label>
              <Filter size={16} />
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select-filtro"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="vacaciones">De Vacaciones</option>
            </select>
          </div>
          
          <button 
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de colaboradores */}
      <div className="tabla-colaboradores-container" ref={containerRef}>
        <div className="tabla-header">
          <h3>Lista de Colaboradores ({colaboradoresFiltrados.length})</h3>
        </div>
        
        <div className="tabla-wrapper">
          {colaboradoresFiltrados.length > 0 ? (
            <table className="tabla-colaboradores-moderna">
              <thead>
                <tr>
                  <th className="table-header">
                    <User size={16} />
                    👤 Colaborador
                  </th>
                  <th className="table-header">
                    <Building2 size={16} />
                    🏢 Unidad
                  </th>
                  <th className="table-header">
                    <Phone size={16} />
                    📞 Teléfono
                  </th>
                  <th className="table-header">Grupo</th>
                  <th className="table-header">Nivel</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresFiltrados.map((colaborador) => (
                  <tr key={colaborador.id} className="fila-colaborador-moderna">
                    <td>
                      <div className="colaborador-info">
                        <strong>{colaborador.nombre}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="unidad-badge-moderna">
                        {colaborador.unidad}
                      </span>
                    </td>
                    <td>
                      <a href={`tel:${colaborador.telefono}`} className="telefono-link-moderna">
                        {colaborador.telefono}
                      </a>
                    </td>
                    <td>
                      <span className={`grupo-badge-moderna grupo-${colaborador.grupoRotacion.toLowerCase()}`}>
                        {colaborador.grupoRotacion}
                      </span>
                    </td>
                    <td>
                      <span className="nivel-badge-moderna">
                        Nivel {colaborador.nivelActual}
                      </span>
                    </td>
                    <td>
                      {estaDeVacaciones(colaborador.id) ? (
                        <span className="estado-badge-moderna vacaciones">
                          🏖️ De Vacaciones
                        </span>
                      ) : colaborador.activo ? (
                        <span className="estado-badge-moderna activo">
                          ✅ Activo
                        </span>
                      ) : (
                        <span className="estado-badge-moderna inactivo">
                          ⏸️ Inactivo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="acciones-colaborador">
                        <button
                          className="btn-accion editar"
                          onClick={() => abrirModal(colaborador)}
                          title="Editar colaborador"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="btn-accion eliminar"
                          onClick={() => eliminarColaborador(colaborador)}
                          title="Eliminar colaborador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-resultados-colaboradores">
              <Search size={48} />
              <h3>No se encontraron colaboradores</h3>
              <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para agregar/editar colaborador */}
      {mostrarModal && (
        <div className="modal-overlay-colaboradores" onClick={cerrarModal}>
          <div className="modal-content-colaboradores" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-colaboradores">
              <h3>
                {modoEdicion ? (
                  <>
                    <Edit3 size={20} />
                    Editar Colaborador
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Agregar Nuevo Colaborador
                  </>
                )}
              </h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-colaboradores">
              <div className="form-group-colaboradores">
                <label>
                  <User size={16} />
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({...formulario, nombre: e.target.value})}
                  placeholder="Ej: Juan Carlos Pérez"
                  className="input-form-colaboradores"
                />
              </div>

              <div className="form-group-colaboradores">
                <label>
                  <Building2 size={16} />
                  Unidad de trabajo *
                </label>
                <select
                  value={formulario.unidad}
                  onChange={(e) => setFormulario({...formulario, unidad: e.target.value})}
                  className="select-form-colaboradores"
                >
                  <option value="">Selecciona una unidad</option>
                  <option value="Infraestructura & Cloud">Infraestructura & Cloud</option>
                  <option value="Gestión de Datos">Gestión de Datos</option>
                  <option value="Comunicaciones">Comunicaciones</option>
                  <option value="Desarrollo">Desarrollo</option>
                  <option value="Seguridad">Seguridad</option>
                </select>
              </div>

              <div className="form-group-colaboradores">
                <label>
                  <Phone size={16} />
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={formulario.telefono}
                  onChange={(e) => setFormulario({...formulario, telefono: e.target.value})}
                  placeholder="Ej: (829) 123-4567"
                  className="input-form-colaboradores"
                />
              </div>

              <div className="form-row-colaboradores">
                <div className="form-group-colaboradores">
                  <label>Grupo de rotación</label>
                  <select
                    value={formulario.grupoRotacion}
                    onChange={(e) => setFormulario({...formulario, grupoRotacion: e.target.value})}
                    className="select-form-colaboradores"
                  >
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                    <option value="FIJO">Fijo (3er Nivel)</option>
                  </select>
                </div>

                <div className="form-group-colaboradores">
                  <label>Nivel actual</label>
                  <select
                    value={formulario.nivelActual}
                    onChange={(e) => setFormulario({...formulario, nivelActual: parseInt(e.target.value)})}
                    className="select-form-colaboradores"
                  >
                    <option value={1}>1er Nivel</option>
                    <option value={2}>2do Nivel</option>
                    <option value={3}>3er Nivel</option>
                  </select>
                </div>
              </div>

              <div className="form-group-colaboradores">
                <label className="checkbox-label-colaboradores">
                  <input
                    type="checkbox"
                    checked={formulario.activo}
                    onChange={(e) => setFormulario({...formulario, activo: e.target.checked})}
                    className="checkbox-form-colaboradores"
                  />
                  <span>Colaborador activo</span>
                </label>
              </div>
            </div>

            <div className="modal-footer-colaboradores">
              <button 
                className="btn-modal-cancelar" 
                onClick={cerrarModal}
              >
                Cancelar
              </button>
              <button 
                className="btn-modal-guardar" 
                onClick={guardarColaborador}
              >
                {modoEdicion ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionColaboradores;