import turnosData from '../data/turnos.json';
import { calcularSemanaDeRotacion, determinarGrupoEnNivel1 } from '../utils/fechas.js';

// Estado en memoria de los datos
let datosEnMemoria = {
  colaboradores: [...turnosData.colaboradores],
  vacaciones: [...turnosData.vacaciones],
  configuracion: { ...turnosData.configuracion }
};

// Inicializar datos desde localStorage si existen
const inicializarDatos = () => {
  const datosGuardados = localStorage.getItem('turnosData');
  if (datosGuardados) {
    try {
      datosEnMemoria = JSON.parse(datosGuardados);
    } catch (error) {
      console.error('Error al cargar datos guardados:', error);
      // Si hay error, usar datos originales
      datosEnMemoria = {
        colaboradores: [...turnosData.colaboradores],
        vacaciones: [...turnosData.vacaciones],
        configuracion: { ...turnosData.configuracion }
      };
    }
  }
};

// Guardar datos en localStorage
const persistirDatos = (source = 'unknown') => {
  try {
    localStorage.setItem('turnosData', JSON.stringify(datosEnMemoria));
    // Disparar evento personalizado para notificar cambios
    window.dispatchEvent(new CustomEvent('turnosDataChanged', { 
      detail: { source, timestamp: Date.now() } 
    }));
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
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
