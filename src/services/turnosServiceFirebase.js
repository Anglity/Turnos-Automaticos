// Servicio principal de turnos con Firebase
import { calcularSemanaDeRotacion, determinarGrupoEnNivel1 } from '../utils/fechas.js';
import firebaseService from './firebaseService.js';

// Debug: Verificar que firebaseService esté disponible
console.log('🔍 turnosServiceFirebase - firebaseService importado:', firebaseService);

// ===== COLABORADORES =====
export const cargarColaboradores = async () => {
  return await firebaseService.getColaboradores();
};

export const agregarColaborador = async (colaborador) => {
  return await firebaseService.addColaborador(colaborador);
};

export const guardarColaborador = async (colaborador) => {
  return await firebaseService.addColaborador(colaborador);
};

export const actualizarColaborador = async (id, colaborador) => {
  try {
    if (!id) {
      throw new Error('ID del colaborador es requerido');
    }
    if (!colaborador) {
      throw new Error('Datos del colaborador son requeridos');
    }
    return await firebaseService.updateColaborador(id, colaborador);
  } catch (error) {
    console.error('❌ Error actualizando colaborador:', error);
    throw error;
  }
};

export const eliminarColaborador = async (id) => {
  try {
    if (!id) {
      throw new Error('ID del colaborador es requerido');
    }
    // Soft delete - marcar como inactivo
    return await firebaseService.updateColaborador(id, { activo: false });
  } catch (error) {
    console.error('❌ Error eliminando colaborador:', error);
    throw error;
  }
};

// ===== VACACIONES =====
export const cargarVacaciones = async () => {
  return await firebaseService.getVacaciones();
};

export const guardarVacaciones = async (vacacion) => {
  console.log('🚀 [FIREBASE] Iniciando guardarVacaciones con:', vacacion);
  
  try {
    console.log('🚀 [FIREBASE] Validando datos...');
    
    if (!vacacion) {
      console.error('❌ [ERROR] Datos de vacación faltantes');
      throw new Error('Datos de la vacación son requeridos');
    }
    
    if (!vacacion.colaboradorId && vacacion.colaboradorId !== 0) {
      console.error('❌ [ERROR] colaboradorId faltante', vacacion.colaboradorId);
      throw new Error('ID del colaborador es requerido');
    }
    
    if (!vacacion.fechaInicio || !vacacion.fechaFin) {
      console.error('❌ [ERROR] fechas faltantes');
      throw new Error('Fechas de inicio y fin son requeridas');
    }
    
    console.log('🚀 [FIREBASE] Llamando a firebaseService.addVacacion...');
    
    const resultado = await firebaseService.addVacacion(vacacion);
    
    console.log('🚀 [FIREBASE] addVacacion devolvió:', resultado, typeof resultado);
    
    if (!resultado) {
      console.error('❌ [ERROR] Resultado es null/undefined');
      throw new Error('La función addVacacion devolvió null/undefined');
    }
    
    console.log('✅ [FIREBASE ÉXITO] Devolviendo resultado:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ [ERROR GENERAL] Error en guardarVacaciones:', error);
    console.error('❌ [ERROR GENERAL] Stack:', error.stack);
    throw error;
  }
};

export const actualizarVacaciones = async (id, vacacion) => {
  try {
    if (!id) {
      throw new Error('ID de la vacación es requerido');
    }
    if (!vacacion) {
      throw new Error('Datos de la vacación son requeridos');
    }
    return await firebaseService.updateVacacion(id, vacacion);
  } catch (error) {
    console.error('❌ Error actualizando vacación:', error);
    throw error;
  }
};

export const eliminarVacaciones = async (id) => {
  try {
    if (!id) {
      throw new Error('ID de la vacación es requerido');
    }
    return await firebaseService.deleteVacacion(id);
  } catch (error) {
    console.error('❌ Error eliminando vacación:', error);
    throw error;
  }
};

// ===== CONFIGURACIÓN =====
export const cargarConfiguracion = async () => {
  return await firebaseService.getConfiguracion();
};

export const guardarConfiguracion = async (clave, valor) => {
  return await firebaseService.setConfiguracion(clave, valor);
};

// ===== TURNOS =====
export const generarTurnos = async (fechaInicio, fechaFin) => {
  try {
    console.log('🔄 Generando turnos desde:', fechaInicio, 'hasta:', fechaFin);
    
    // Cargar datos necesarios
    const colaboradores = await cargarColaboradores();
    const vacaciones = await cargarVacaciones();
    const configuracion = await cargarConfiguracion();
    
    // Aplicar lógica de generación de turnos
    const turnosGenerados = [];
    
    const fechaRef = new Date(configuracion.fechaReferencia || '2025-08-26');
    const fechaInicial = new Date(fechaInicio);
    const fechaFinal = new Date(fechaFin);
    
    // Configurar que la semana actual es la semana 2 (1 de septiembre)
    const hoy = new Date('2025-09-01'); // 1 de septiembre = semana 2
    let semanaActual = 2;
    
    console.log('📅 Semana actual configurada:', semanaActual);
    
    for (let fecha = new Date(fechaInicial); fecha <= fechaFinal; fecha.setDate(fecha.getDate() + 7)) {
      const semanaRotacion = calcularSemanaDeRotacion(fecha, fechaRef);
      const grupoNivel1 = determinarGrupoEnNivel1(semanaRotacion, configuracion.grupoInicialNivel1);
      
      console.log('📅 Procesando semana:', semanaRotacion, 'Grupo Nivel 1:', grupoNivel1);
      
      // Obtener colaboradores por nivel que no estén de vacaciones
      const colaboradoresDisponibles = colaboradores.filter(colaborador => {
        const tieneVacaciones = vacaciones.some(vacacion => {
          if (vacacion.colaboradorId !== colaborador.id) return false;
          const inicioVac = new Date(vacacion.fechaInicio);
          const finVac = new Date(vacacion.fechaFin);
          return fecha >= inicioVac && fecha <= finVac;
        });
        return !tieneVacaciones;
      });
      
      // Asignar turnos por nivel
      ['1', '2', '3'].forEach(nivel => {
        let colaboradorAsignado = null;
        
        if (nivel === '3') {
          // Nivel 3: Siempre los FIJOS
          colaboradorAsignado = colaboradoresDisponibles.find(c => 
            c.nivelActual === 3 && c.grupoRotacion === 'FIJO'
          );
        } else {
          // Niveles 1 y 2: Por rotación de grupos
          const grupoObjetivo = (nivel === '1') ? grupoNivel1 : (grupoNivel1 === 'A' ? 'B' : 'A');
          colaboradorAsignado = colaboradoresDisponibles.find(c => 
            c.nivelActual === parseInt(nivel) && c.grupoRotacion === grupoObjetivo
          );
        }
        
        if (colaboradorAsignado) {
          turnosGenerados.push({
            semana: semanaRotacion,
            fechaInicio: fecha.toISOString().split('T')[0],
            fechaFin: new Date(fecha.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel: nivel,
            colaboradorId: colaboradorAsignado.id,
            colaboradorNombre: colaboradorAsignado.nombre,
            esReemplazo: false
          });
        }
      });
    }
    
    console.log('✅ Turnos generados:', turnosGenerados.length);
    return turnosGenerados;
    
  } catch (error) {
    console.error('❌ Error generando turnos:', error);
    throw error;
  }
};

// ===== INICIALIZACIÓN =====
export const inicializarDatos = async () => {
  try {
    console.log('🔄 Inicializando datos con Firebase...');
    await firebaseService.inicializarDatos();
    console.log('✅ Datos inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    throw error;
  }
};

// ===== FUNCIONES ESPECÍFICAS DE TURNOS =====

// Verificar si un colaborador está de vacaciones en una fecha específica
export const estaDeVacaciones = async (colaboradorId, fechaInicio, fechaFin) => {
  try {
    const vacaciones = await cargarVacaciones();
    return vacaciones.some(v => 
      v.colaboradorId === colaboradorId &&
      v.activo &&
      new Date(fechaInicio) <= new Date(v.fechaFin) &&
      new Date(fechaFin) >= new Date(v.fechaInicio)
    );
  } catch (error) {
    console.error('❌ Error verificando vacaciones:', error);
    return false;
  }
};

// Buscar reemplazo por misma unidad
export const buscarReemplazoPorUnidad = async (colaboradorOriginal, colaboradores, fechaInicio, fechaFin) => {
  for (const c of colaboradores) {
    if (c.id !== colaboradorOriginal.id &&
        c.unidad === colaboradorOriginal.unidad &&
        c.activo) {
      const enVacaciones = await estaDeVacaciones(c.id, fechaInicio, fechaFin);
      if (!enVacaciones) {
        return c;
      }
    }
  }
  return null;
};

// Generar turnos para una semana específica
export const generarTurnosPorSemana = async (fechaConsulta) => {
  try {
    const colaboradores = await cargarColaboradores();
    const config = await cargarConfiguracion();
    
  const numeroSemana = calcularSemanaDeRotacion(fechaConsulta, '2025-08-26');
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
  } catch (error) {
    console.error('❌ Error generando turnos por semana:', error);
    throw error;
  }
};

// Aplicar reemplazos por vacaciones
export const aplicarReemplazos = async (turnos, fechaInicio, fechaFin) => {
  try {
    // Validar que turnos tenga la estructura correcta
    if (!turnos || !Array.isArray(turnos.nivel1) || !Array.isArray(turnos.nivel2) || !Array.isArray(turnos.nivel3)) {
      console.error('❌ Estructura de turnos inválida:', turnos);
      return {
        nivel1: [],
        nivel2: [],
        nivel3: [],
        numeroSemana: turnos?.numeroSemana || 1,
        grupoEnNivel1: turnos?.grupoEnNivel1 || 'A'
      };
    }

    const colaboradores = await cargarColaboradores();
    let nivel1Final = [...turnos.nivel1];
    let nivel2Final = [...turnos.nivel2];
    let nivel3Final = [...turnos.nivel3];
    
    // Verificar vacaciones en nivel 1
    for (let i = 0; i < nivel1Final.length; i++) {
      const colaborador = nivel1Final[i];
      const enVacaciones = await estaDeVacaciones(colaborador.id, fechaInicio, fechaFin);
      
      if (enVacaciones) {
        const reemplazo = await buscarReemplazoPorUnidad(colaborador, turnos.nivel2, fechaInicio, fechaFin);
        if (reemplazo) {
          // Remover reemplazo de nivel 2
          nivel2Final = nivel2Final.filter(c => c.id !== reemplazo.id);
          nivel1Final[i] = { ...reemplazo, reemplazaA: colaborador.nombre, esReemplazo: true };
        } else {
          nivel1Final[i] = { ...colaborador, enVacaciones: true };
        }
      }
    }
    
    // Verificar vacaciones en nivel 2
    for (let i = 0; i < nivel2Final.length; i++) {
      const colaborador = nivel2Final[i];
      const enVacaciones = await estaDeVacaciones(colaborador.id, fechaInicio, fechaFin);
      
      if (enVacaciones) {
        nivel2Final[i] = { ...colaborador, enVacaciones: true };
      }
    }
    
    // Verificar vacaciones en nivel 3
    for (let i = 0; i < nivel3Final.length; i++) {
      const colaborador = nivel3Final[i];
      const enVacaciones = await estaDeVacaciones(colaborador.id, fechaInicio, fechaFin);
      
      if (enVacaciones) {
        nivel3Final[i] = { ...colaborador, enVacaciones: true };
      }
    }
    
    return {
      ...turnos,
      nivel1: nivel1Final,
      nivel2: nivel2Final,
      nivel3: nivel3Final
    };
  } catch (error) {
    console.error('❌ Error aplicando reemplazos:', error);
    throw error;
  }
};

// ===== UTILIDADES =====
export const restaurarDatosOriginales = async () => {
  try {
    console.log('🔄 Restaurando datos originales...');
    
    // Limpiar duplicados y recrear datos
    await firebaseService.limpiarDuplicados();
    
    return { success: true, message: 'Datos restaurados correctamente' };
  } catch (error) {
    console.error('❌ Error en restaurarDatosOriginales:', error);
    throw error;
  }
};

// Función para limpiar duplicados manualmente
export const limpiarDuplicados = async () => {
  try {
    console.log('🧹 Limpiando duplicados...');
    await firebaseService.limpiarDuplicados();
    return { success: true, message: 'Duplicados eliminados correctamente' };
  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error);
    throw error;
  }
};

// Inicializar automáticamente al importar
inicializarDatos().catch(console.error);

// 🧹 FUNCIONES DE LIMPIEZA AUTOMÁTICA DE BASE DE DATOS
export const limpiarVacacionesVencidas = async () => {
  try {
    return await firebaseService.limpiarVacacionesVencidas();
  } catch (error) {
    console.error('❌ Error limpiando vacaciones vencidas:', error);
    throw error;
  }
};

export const limpiarColaboradoresInactivos = async () => {
  try {
    return await firebaseService.limpiarColaboradoresInactivos();
  } catch (error) {
    console.error('❌ Error limpiando colaboradores inactivos:', error);
    throw error;
  }
};

export const limpiarVacacionesHuerfanas = async () => {
  try {
    return await firebaseService.limpiarVacacionesHuerfanas();
  } catch (error) {
    console.error('❌ Error limpiando vacaciones huérfanas:', error);
    throw error;
  }
};

export const ejecutarLimpiezaCompleta = async () => {
  try {
    return await firebaseService.ejecutarLimpiezaCompleta();
  } catch (error) {
    console.error('❌ Error en limpieza completa:', error);
    throw error;
  }
};

export const programarLimpiezaAutomatica = () => {
  try {
    return firebaseService.programarLimpiezaAutomatica();
  } catch (error) {
    console.error('❌ Error programando limpieza automática:', error);
    throw error;
  }
};

// ===== FUNCIÓN TEMPORAL PARA CORREGIR CONFIGURACIÓN =====
export const actualizarConfiguracionReferencia = async () => {
  try {
    console.log('🔄 Actualizando fecha de referencia a 2025-08-26...');
    await guardarConfiguracion('fechaReferencia', '2025-08-26');
    await guardarConfiguracion('grupoInicialNivel1', 'A');
    await guardarConfiguracion('semanaActual', 2);
    console.log('✅ Configuración actualizada correctamente');
    
    // Emitir evento para actualizar la UI
    window.dispatchEvent(new CustomEvent('configurationUpdated'));
    
    return true;
  } catch (error) {
    console.error('❌ Error actualizando configuración:', error);
    return false;
  }
};

export default {
  cargarColaboradores,
  agregarColaborador,
  guardarColaborador,
  actualizarColaborador,
  eliminarColaborador,
  cargarVacaciones,
  guardarVacaciones,
  actualizarVacaciones,
  eliminarVacaciones,
  cargarConfiguracion,
  guardarConfiguracion,
  generarTurnos,
  inicializarDatos,
  restaurarDatosOriginales,
  limpiarDuplicados,
  estaDeVacaciones,
  buscarReemplazoPorUnidad,
  generarTurnosPorSemana,
  aplicarReemplazos,
  // 🧹 Funciones de limpieza automática
  limpiarVacacionesVencidas,
  limpiarColaboradoresInactivos,
  limpiarVacacionesHuerfanas,
  ejecutarLimpiezaCompleta,
  programarLimpiezaAutomatica,
  // 🔧 Función temporal para corregir configuración
  actualizarConfiguracionReferencia
};
