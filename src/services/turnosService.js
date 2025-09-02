import turnosData from '../data/turnos.json';
import { calcularSemanaDeRotacion, determinarGrupoEnNivel1 } from '../utils/fechas.js';

// CLAVE ÚNICA para este proyecto - NO cambia con puerto/IP
const STORAGE_KEY = 'turnos_automaticos_utesa_data_v1';

// Estado en memoria de los datos
let datosEnMemoria = {
  colaboradores: [...turnosData.colaboradores],
  vacaciones: [...turnosData.vacaciones],
  configuracion: { ...turnosData.configuracion }
};

// Inicializar datos usando clave única (independiente de puerto/IP)
const inicializarDatos = () => {
  // Primero verificar si hay migración pendiente
  verificarYMigrarDatos();
  
  // Intentar cargar con la clave específica del proyecto
  const datosGuardados = localStorage.getItem(STORAGE_KEY);
  
  if (datosGuardados) {
    try {
      const datosParsed = JSON.parse(datosGuardados);
      // Verificar que los datos sean válidos
      if (datosParsed.colaboradores && datosParsed.vacaciones && datosParsed.configuracion) {
        datosEnMemoria = datosParsed;
        console.log('✅ Datos cargados correctamente desde almacenamiento persistente');
        
        // Verificar integridad de los datos cargados
        if (!verificarIntegridadDatos()) {
          console.log('🔄 Datos corruptos, se restauraron automáticamente');
        }
        return;
      }
    } catch (error) {
      console.error('❌ Error al cargar datos guardados:', error);
    }
  }
  
  // Si no hay datos o hay error, usar datos originales
  console.log('📋 Usando datos originales del JSON');
  datosEnMemoria = {
    colaboradores: [...turnosData.colaboradores],
    vacaciones: [...turnosData.vacaciones],
    configuracion: { ...turnosData.configuracion }
  };
  
  // Guardar inmediatamente los datos originales
  persistirDatos('init');
};

// Guardar datos con clave única (persiste aunque cambies puerto/IP)
const persistirDatos = (source = 'unknown') => {
  try {
    // Usar la clave específica del proyecto
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datosEnMemoria));
    
    // También mantener compatibilidad con la clave antigua (por si acaso)
    localStorage.setItem('turnosData', JSON.stringify(datosEnMemoria));
    
    console.log(`💾 Datos guardados automáticamente (${source})`);
    
    // Disparar evento personalizado para notificar cambios
    window.dispatchEvent(new CustomEvent('turnosDataChanged', { 
      detail: { source, timestamp: Date.now() } 
    }));
  } catch (error) {
    console.error('❌ Error al guardar datos:', error);
  }
};

// Función para migrar datos si el usuario viene de otro puerto/IP
const verificarYMigrarDatos = () => {
  // Buscar datos con la clave antigua
  const datosAntiguos = localStorage.getItem('turnosData');
  const datosNuevos = localStorage.getItem(STORAGE_KEY);
  
  // Si no hay datos nuevos pero sí antiguos, migrar
  if (!datosNuevos && datosAntiguos) {
    try {
      const datosParaMigrar = JSON.parse(datosAntiguos);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datosParaMigrar));
      console.log('🔄 Datos migrados automáticamente desde configuración anterior');
      return true;
    } catch (error) {
      console.error('❌ Error al migrar datos:', error);
    }
  }
  
  return false;
};

// Verificar integridad de datos (por si se corrompen)
const verificarIntegridadDatos = () => {
  const colaboradores = datosEnMemoria.colaboradores;
  const vacaciones = datosEnMemoria.vacaciones;
  
  let problemasEncontrados = [];
  
  // Verificar que hay colaboradores
  if (!colaboradores || colaboradores.length === 0) {
    problemasEncontrados.push('No hay colaboradores');
  }
  
  // Verificar que cada colaborador tiene campos requeridos
  colaboradores.forEach((col, index) => {
    if (!col.id || !col.nombre || !col.unidad) {
      problemasEncontrados.push(`Colaborador ${index + 1} tiene campos faltantes`);
    }
  });
  
  // Si hay problemas, restaurar datos originales automáticamente
  if (problemasEncontrados.length > 0) {
    console.warn('⚠️ Datos corruptos detectados, restaurando automáticamente:', problemasEncontrados);
    datosEnMemoria = {
      colaboradores: [...turnosData.colaboradores],
      vacaciones: [...turnosData.vacaciones],
      configuracion: { ...turnosData.configuracion }
    };
    persistirDatos('auto-restore');
    return false;
  }
  
  return true;
};

// Inicializar al cargar el módulo
inicializarDatos();

// Cargar datos desde memoria
export const cargarColaboradores = () => {
  return [...datosEnMemoria.colaboradores];
};

export const cargarVacaciones = () => {
  return [...datosEnMemoria.vacaciones];
};

export const cargarConfiguracion = () => {
  return { ...datosEnMemoria.configuracion };
};

// Verificar si un colaborador está de vacaciones en una fecha específica
export const estaDeVacaciones = (colaboradorId, fechaInicio, fechaFin) => {
  const vacaciones = cargarVacaciones();
  return vacaciones.some(v => 
    v.colaboradorId === colaboradorId &&
    v.activo &&
    new Date(fechaInicio) <= new Date(v.fechaFin) &&
    new Date(fechaFin) >= new Date(v.fechaInicio)
  );
};

// Buscar reemplazo por misma unidad
export const buscarReemplazoPorUnidad = (colaboradorOriginal, colaboradores, fechaInicio, fechaFin) => {
  return colaboradores.find(c => 
    c.id !== colaboradorOriginal.id &&
    c.unidad === colaboradorOriginal.unidad &&
    c.activo &&
    !estaDeVacaciones(c.id, fechaInicio, fechaFin)
  );
};

// Generar turnos para una semana específica
export const generarTurnosPorSemana = (fechaConsulta) => {
  const colaboradores = cargarColaboradores();
  const config = cargarConfiguracion();
  
  const numeroSemana = calcularSemanaDeRotacion(fechaConsulta, config.fechaReferencia);
  const grupoEnNivel1 = determinarGrupoEnNivel1(numeroSemana, config.grupoInicialNivel1);
  
  // Separar colaboradores por grupo y nivel
  const grupoA = colaboradores.filter(c => c.grupoRotacion === 'A');
  const grupoB = colaboradores.filter(c => c.grupoRotacion === 'B');
  const nivel3Fijo = colaboradores.filter(c => c.grupoRotacion === 'FIJO');
  
  // Asignar niveles según rotación
  let nivel1, nivel2;
  if (grupoEnNivel1 === 'A') {
    nivel1 = grupoA;
    nivel2 = grupoB;
  } else {
    nivel1 = grupoB;
    nivel2 = grupoA;
  }
  
  return {
    numeroSemana,
    grupoEnNivel1,
    nivel1,
    nivel2,
    nivel3: nivel3Fijo
  };
};

// Aplicar reemplazos por vacaciones
export const aplicarReemplazos = (turnos, fechaInicio, fechaFin) => {
  const colaboradores = cargarColaboradores();
  let nivel1Final = [...turnos.nivel1];
  let nivel2Final = [...turnos.nivel2];
  let nivel3Final = [...turnos.nivel3];
  
  // Verificar vacaciones en nivel 1
  nivel1Final = nivel1Final.map(colaborador => {
    if (estaDeVacaciones(colaborador.id, fechaInicio, fechaFin)) {
      const reemplazo = buscarReemplazoPorUnidad(colaborador, turnos.nivel2, fechaInicio, fechaFin);
      if (reemplazo) {
        // Remover reemplazo de nivel 2
        nivel2Final = nivel2Final.filter(c => c.id !== reemplazo.id);
        return { ...reemplazo, reemplazaA: colaborador.nombre, esReemplazo: true };
      }
      return { ...colaborador, enVacaciones: true };
    }
    return colaborador;
  }); // Quitar el filter para mantener colaboradores de vacaciones
  
  // Verificar vacaciones en nivel 2
  nivel2Final = nivel2Final.map(colaborador => {
    if (estaDeVacaciones(colaborador.id, fechaInicio, fechaFin)) {
      return { ...colaborador, enVacaciones: true };
    }
    return colaborador;
  });
  
  // Verificar vacaciones en nivel 3
  nivel3Final = nivel3Final.map(colaborador => {
    if (estaDeVacaciones(colaborador.id, fechaInicio, fechaFin)) {
      return { ...colaborador, enVacaciones: true };
    }
    return colaborador;
  });
  
  return {
    ...turnos,
    nivel1: nivel1Final,
    nivel2: nivel2Final,
    nivel3: nivel3Final
  };
};

// Guardar nuevos colaboradores
export const guardarColaborador = (nuevoColaborador) => {
  const colaborador = {
    ...nuevoColaborador,
    id: nuevoColaborador.id || Date.now()
  };
  
  datosEnMemoria.colaboradores.push(colaborador);
  persistirDatos('GestionColaboradores');
  return colaborador;
};

// Actualizar colaborador existente
export const actualizarColaborador = (colaboradorActualizado) => {
  const index = datosEnMemoria.colaboradores.findIndex(c => c.id === colaboradorActualizado.id);
  if (index !== -1) {
    datosEnMemoria.colaboradores[index] = { ...colaboradorActualizado };
    persistirDatos('GestionColaboradores');
    return datosEnMemoria.colaboradores[index];
  }
  return null;
};

// Eliminar colaborador
export const eliminarColaborador = (colaboradorId) => {
  const index = datosEnMemoria.colaboradores.findIndex(c => c.id === colaboradorId);
  if (index !== -1) {
    const colaboradorEliminado = datosEnMemoria.colaboradores.splice(index, 1)[0];
    
    // También eliminar sus vacaciones
    datosEnMemoria.vacaciones = datosEnMemoria.vacaciones.filter(v => v.colaboradorId !== colaboradorId);
    
    persistirDatos('GestionColaboradores');
    return colaboradorEliminado;
  }
  return null;
};

// Guardar vacaciones
export const guardarVacaciones = (nuevasVacaciones) => {
  const vacaciones = {
    ...nuevasVacaciones,
    id: nuevasVacaciones.id || Date.now()
  };
  
  datosEnMemoria.vacaciones.push(vacaciones);
  persistirDatos('GestionVacaciones');
  return vacaciones;
};

// Actualizar vacaciones existentes
export const actualizarVacaciones = (vacacionesActualizadas) => {
  const index = datosEnMemoria.vacaciones.findIndex(v => v.id === vacacionesActualizadas.id);
  if (index !== -1) {
    datosEnMemoria.vacaciones[index] = { ...vacacionesActualizadas };
    persistirDatos('GestionVacaciones');
    return datosEnMemoria.vacaciones[index];
  }
  return null;
};

// Eliminar vacaciones
export const eliminarVacaciones = (vacacionesId) => {
  const index = datosEnMemoria.vacaciones.findIndex(v => v.id === vacacionesId);
  if (index !== -1) {
    const vacacionesEliminadas = datosEnMemoria.vacaciones.splice(index, 1)[0];
    persistirDatos('GestionVacaciones');
    return vacacionesEliminadas;
  }
  return null;
};

// Restaurar datos originales (útil para reset)
export const restaurarDatosOriginales = () => {
  datosEnMemoria = {
    colaboradores: [...turnosData.colaboradores],
    vacaciones: [...turnosData.vacaciones],
    configuracion: { ...turnosData.configuracion }
  };
  persistirDatos('restore');
  return datosEnMemoria;
};

// Función para obtener estadísticas de almacenamiento
export const obtenerEstadisticasAlmacenamiento = () => {
  const datos = JSON.stringify(datosEnMemoria);
  return {
    tamanoKB: (datos.length / 1024).toFixed(2),
    colaboradores: datosEnMemoria.colaboradores.length,
    vacaciones: datosEnMemoria.vacaciones.length,
    ultimaActualizacion: new Date().toLocaleString(),
    claveAlmacenamiento: STORAGE_KEY
  };
};
