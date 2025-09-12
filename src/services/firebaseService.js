// Servicio Firebase para Turnos Automáticos BANFONDESA
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  writeBatch,
  getDoc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import eventBus, { EVENTS } from '../utils/eventBus';
import { calcularSemanaDeRotacion, obtenerLunesDelamSemana } from '../utils/fechas';

class FirebaseService {
  constructor() {
    console.log('🔥 Firebase Service inicializado');
    this.colaboradoresListener = null;
    this.vacacionesListener = null;
    // Nota: desactivamos la inicialización automática y la limpieza automática inicial
    // para evitar reinicios o eliminaciones no deseadas en entornos reales.
    // this.inicializarDatos(); // deshabilitado intencionalmente
    // this.setupAutoCleanup(); // deshabilitado por seguridad; activar manualmente si se desea
    this.inicializarListeners();
  }

  // Permite activar la limpieza automática manualmente si el equipo lo desea
  activarLimpiezaAutomatica() {
    return this.setupAutoCleanup();
  }

  // Programar actualización semanal de la configuración 'semanaActual'
  // NO se activa automáticamente; llamar a `activarActualizacionSemanal()` para habilitar.
  activarActualizacionSemanal() {
    // Calcular timeout hasta el próximo lunes 00:00 hora local
    const ahora = new Date();
    const dia = ahora.getDay();
    const diasHastaLunes = (8 - dia) % 7; // días restantes hasta el próximo lunes
    const proximoLunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + diasHastaLunes);
    proximoLunes.setHours(0, 0, 0, 0);

    const msHastaProximoLunes = proximoLunes.getTime() - ahora.getTime();

    // Esperar hasta el próximo lunes 00:00 y luego ejecutar cada 7 días
    setTimeout(() => {
      this._actualizarSemanaActual();
      // Ejecutar semanalmente
      this._semanaInterval = setInterval(() => this._actualizarSemanaActual(), 7 * 24 * 60 * 60 * 1000);
    }, msHastaProximoLunes);

    return true;
  }

  // Desactivar la actualización semanal si está activa
  desactivarActualizacionSemanal() {
    if (this._semanaInterval) {
      clearInterval(this._semanaInterval);
      this._semanaInterval = null;
      return true;
    }
    return false;
  }

  async _actualizarSemanaActual() {
    try {
      const configRef = doc(db, 'configuracion', 'general');
      const configSnap = await getDoc(configRef);
      let fechaReferencia = '2025-08-26';
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data.fechaReferencia) fechaReferencia = data.fechaReferencia;
      }

      // Calcular semana usando el lunes de hoy
      const hoy = new Date();
      const lunesHoy = obtenerLunesDelamSemana(hoy);
      const numeroSemana = calcularSemanaDeRotacion(lunesHoy, fechaReferencia);

      await updateDoc(configRef, { semanaActual: numeroSemana, updatedAt: new Date() });
      console.log('🔁 Semana actual actualizada automáticamente a:', numeroSemana);
      // Emitir evento para actualizar la UI
      window.dispatchEvent(new CustomEvent('configurationUpdated'));
    } catch (error) {
      console.error('❌ Error actualizando semanaActual automáticamente:', error);
    }
  }

  // 🔄 Inicializar listeners en tiempo real
  inicializarListeners() {
    try {
      // Listener para colaboradores
      const colaboradoresRef = collection(db, 'colaboradores');
      this.colaboradoresListener = onSnapshot(colaboradoresRef, (snapshot) => {
        console.log('🔄 Cambios detectados en colaboradores');
        eventBus.emit(EVENTS.COLABORADORES_UPDATED, {
          timestamp: new Date(),
          size: snapshot.size
        });
        eventBus.emit(EVENTS.DATA_CHANGED, { type: 'colaboradores' });
      });

      // Listener para vacaciones
      const vacacionesRef = collection(db, 'vacaciones');
      this.vacacionesListener = onSnapshot(vacacionesRef, (snapshot) => {
        console.log('🔄 Cambios detectados en vacaciones');
        eventBus.emit(EVENTS.VACACIONES_UPDATED, {
          timestamp: new Date(),
          size: snapshot.size
        });
        eventBus.emit(EVENTS.DATA_CHANGED, { type: 'vacaciones' });
      });

      console.log('✅ Listeners en tiempo real inicializados');
    } catch (error) {
      console.error('❌ Error inicializando listeners:', error);
    }
  }

  // Limpiar listeners
  limpiarListeners() {
    if (this.colaboradoresListener) {
      this.colaboradoresListener();
      this.colaboradoresListener = null;
    }
    if (this.vacacionesListener) {
      this.vacacionesListener();
      this.vacacionesListener = null;
    }
  }

  // Auto-inicializar datos si están vacíos
  async inicializarDatos() {
    try {
      const colaboradoresRef = collection(db, 'colaboradores');
      const colaboradoresSnap = await getDocs(colaboradoresRef);
      
      console.log('📊 Colaboradores encontrados en Firebase:', colaboradoresSnap.size);
      
      // Si hay más de 8 colaboradores, probablemente hay duplicados
      if (colaboradoresSnap.size > 8) {
        console.log('⚠️ Detectados posibles duplicados. Limpiando base de datos...');
        await this.limpiarDuplicados();
        return;
      }
      
      if (colaboradoresSnap.empty) {
        console.log('📊 Inicializando datos base...');
        await this.crearDatosIniciales();
      } else {
        console.log('✅ Datos ya existen en Firebase');
      }
    } catch (error) {
      console.error('Error inicializando datos:', error);
    }
  }

  // Limpiar colaboradores duplicados
  async limpiarDuplicados() {
    try {
      console.log('🧹 Limpiando colaboradores duplicados...');
      
      // Eliminar todos los colaboradores
      const colaboradoresRef = collection(db, 'colaboradores');
      const snapshot = await getDocs(colaboradoresRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      console.log(`🗑️ Eliminados ${snapshot.docs.length} colaboradores duplicados`);
      
  // NOTA: No recreamos automáticamente los datos para evitar reinicios indeseados.
  // El equipo debe decidir cuándo restaurar datos iniciales manualmente.
    } catch (error) {
      console.error('Error limpiando duplicados:', error);
    }
  }

  // Crear datos iniciales
  async crearDatosIniciales() {
    const colaboradoresIniciales = [
      { nombre: 'JASON VARGAS', unidad: 'Infraestructura & Cloud', telefono: '(829) 662-4002', grupoRotacion: 'A', nivelActual: 1, activo: true },
      { nombre: 'ELVIN REYES', unidad: 'Gestión de Datos', telefono: '(809) 641-5018', grupoRotacion: 'A', nivelActual: 1, activo: true },
      { nombre: 'SERGIO GUERRERO', unidad: 'Comunicaciones', telefono: '(829) 345-5788', grupoRotacion: 'A', nivelActual: 1, activo: true },
      { nombre: 'JUAN DOMINGUEZ', unidad: 'Comunicaciones', telefono: '(829) 345-5788', grupoRotacion: 'B', nivelActual: 2, activo: true },
      { nombre: 'ANEUDY HERNANDEZ', unidad: 'Infraestructura & Cloud', telefono: '(829) 662-5518', grupoRotacion: 'B', nivelActual: 2, activo: true },
      { nombre: 'CRISTIAN MELO', unidad: 'Gestión de Datos', telefono: '(809) 720-9800', grupoRotacion: 'B', nivelActual: 2, activo: true },
      { nombre: 'MINERVA SANTANA', unidad: 'Infraestructura & Cloud', telefono: '(849) 635-9782', grupoRotacion: 'FIJO', nivelActual: 3, activo: true },
      { nombre: 'VLADY REINOSO', unidad: 'Operaciones TI', telefono: '(829) 345-1196', grupoRotacion: 'FIJO', nivelActual: 3, activo: true }
    ];

    const batch = writeBatch(db);
    const colaboradoresRef = collection(db, 'colaboradores');
    
    colaboradoresIniciales.forEach((colaborador) => {
      const docRef = doc(colaboradoresRef);
      batch.set(docRef, {
        ...colaborador,
        createdAt: new Date()
      });
    });

    await batch.commit();
    
    // Configuración inicial
    // Garantizar un único documento de configuración con id 'general'
    const configRef = doc(db, 'configuracion', 'general');
    try {
      await updateDoc(configRef, {
        fechaReferencia: '2025-08-26',
        grupoInicialNivel1: 'A',
        semanaActual: 3,
        updatedAt: new Date()
      });
    } catch (e) {
      // Si no existe, crear con setDoc para asegurar el id 'general'
      await setDoc(configRef, {
        fechaReferencia: '2025-08-26',
        grupoInicialNivel1: 'A',
        semanaActual: 3,
        createdAt: new Date()
      });
    }

    console.log('✅ Datos iniciales creados');
  }

  // Auto-limpieza de datos antiguos (opcional)
  async setupAutoCleanup() {
    // Limpiar vacaciones muy antigas cada hora
    setInterval(async () => {
      try {
        const fechaLimite = new Date();
        fechaLimite.setFullYear(fechaLimite.getFullYear() - 1); // 1 año atrás
        
        const vacacionesRef = collection(db, 'vacaciones');
        const vacacionesViejas = query(
          vacacionesRef, 
          where('fechaFin', '<', fechaLimite)
        );
        
        const snapshot = await getDocs(vacacionesViejas);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        
        if (snapshot.docs.length > 0) {
          await batch.commit();
          console.log(`🧹 Limpiadas ${snapshot.docs.length} vacaciones antiguas`);
        }
      } catch (error) {
        console.error('Error en auto-limpieza:', error);
      }
    }, 3600000); // 1 hora
  }

  // Colaboradores
  async getColaboradores() {
    try {
      const colaboradoresRef = collection(db, 'colaboradores');
      const q = query(colaboradoresRef, where('activo', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo colaboradores:', error);
      throw error;
    }
  }

  async addColaborador(colaborador) {
    try {
      const colaboradoresRef = collection(db, 'colaboradores');
      const docRef = await addDoc(colaboradoresRef, {
        ...colaborador,
        activo: true,
        createdAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error agregando colaborador:', error);
      throw error;
    }
  }

  async updateColaborador(id, colaborador) {
    try {
      const colaboradorRef = doc(db, 'colaboradores', id);
      const datosActualizados = {
        ...colaborador,
        updatedAt: new Date()
      };
      
      await updateDoc(colaboradorRef, datosActualizados);
      
      // Devolver el colaborador actualizado con su ID
      return {
        id,
        ...datosActualizados
      };
    } catch (error) {
      console.error('Error actualizando colaborador:', error);
      throw error;
    }
  }

  async deleteColaborador(id) {
    try {
      const colaboradorRef = doc(db, 'colaboradores', id);
      await updateDoc(colaboradorRef, {
        activo: false,
        deletedAt: new Date()
      });
    } catch (error) {
      console.error('Error eliminando colaborador:', error);
      throw error;
    }
  }

  // Vacaciones
  async getVacaciones() {
    try {
      const vacacionesRef = collection(db, 'vacaciones');
      const q = query(vacacionesRef, orderBy('fechaInicio', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        // Mantener las fechas como strings para evitar problemas de timezone
      }));
    } catch (error) {
      console.error('Error obteniendo vacaciones:', error);
      throw error;
    }
  }

  async addVacacion(vacacion) {
    try {
      const vacacionesRef = collection(db, 'vacaciones');
      const docRef = await addDoc(vacacionesRef, {
        ...vacacion,
        // Mantener fechas como strings para evitar problemas de timezone
        fechaInicio: vacacion.fechaInicio,
        fechaFin: vacacion.fechaFin,
        createdAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error agregando vacación:', error);
      throw error;
    }
  }

  async updateVacacion(id, vacacion) {
    try {
      const vacacionRef = doc(db, 'vacaciones', id);
      await updateDoc(vacacionRef, {
        ...vacacion,
        // Mantener fechas como strings para evitar problemas de timezone
        fechaInicio: vacacion.fechaInicio,
        fechaFin: vacacion.fechaFin,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error actualizando vacación:', error);
      throw error;
    }
  }

  async deleteVacacion(id) {
    try {
      const vacacionRef = doc(db, 'vacaciones', id);
      await deleteDoc(vacacionRef);
    } catch (error) {
      console.error('Error eliminando vacación:', error);
      throw error;
    }
  }

  // Configuración
  async getConfiguracion() {
    try {
      const configRef = collection(db, 'configuracion');
      const querySnapshot = await getDocs(configRef);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      // Configuración por defecto si no existe
        return {
          fechaReferencia: '2025-08-26', // SIEMPRE USAR ESTA FECHA
          grupoInicialNivel1: 'A',
          semanaActual: 3
        };
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      throw error;
    }
  }

  async updateConfiguracion(configuracion) {
    try {
      const configRef = collection(db, 'configuracion');
      const querySnapshot = await getDocs(configRef);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...configuracion,
          updatedAt: new Date()
        });
      } else {
        await addDoc(configRef, {
          ...configuracion,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      throw error;
    }
  }

  // 🧹 FUNCIONES DE LIMPIEZA AUTOMÁTICA
  
  // Eliminar vacaciones vencidas hace más de 6 meses
  async limpiarVacacionesVencidas() {
    try {
      console.log('🧹 Iniciando limpieza de vacaciones vencidas...');
      const seiseMesesAtras = new Date();
      seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
      const fechaLimite = seiseMesesAtras.toISOString().split('T')[0];
      
      const vacacionesRef = collection(db, 'vacaciones');
      const q = query(
        vacacionesRef,
        where('fechaFin', '<', fechaLimite),
        where('activo', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const eliminados = [];
      
      for (const doc of querySnapshot.docs) {
        await deleteDoc(doc.ref);
        eliminados.push(doc.id);
      }
      
      console.log(`✅ Eliminadas ${eliminados.length} vacaciones vencidas`);
      return eliminados;
    } catch (error) {
      console.error('❌ Error limpiando vacaciones vencidas:', error);
      return [];
    }
  }

  // Eliminar colaboradores inactivos sin vacaciones asociadas
  async limpiarColaboradoresInactivos() {
    try {
      console.log('🧹 Iniciando limpieza de colaboradores inactivos...');
      
      // Obtener colaboradores inactivos
      const colaboradoresRef = collection(db, 'colaboradores');
      const qInactivos = query(colaboradoresRef, where('activo', '==', false));
      const colaboradoresInactivos = await getDocs(qInactivos);
      
      const eliminados = [];
      
      for (const colaboradorDoc of colaboradoresInactivos.docs) {
        const colaboradorId = colaboradorDoc.id;
        
        // Verificar si tiene vacaciones asociadas
        const vacacionesRef = collection(db, 'vacaciones');
        const qVacaciones = query(vacacionesRef, where('colaboradorId', '==', colaboradorId));
        const vacacionesSnapshot = await getDocs(qVacaciones);
        
        // Si no tiene vacaciones, eliminar colaborador
        if (vacacionesSnapshot.empty) {
          await deleteDoc(colaboradorDoc.ref);
          eliminados.push(colaboradorId);
        }
      }
      
      console.log(`✅ Eliminados ${eliminados.length} colaboradores inactivos sin vacaciones`);
      return eliminados;
    } catch (error) {
      console.error('❌ Error limpiando colaboradores inactivos:', error);
      return [];
    }
  }

  // Eliminar vacaciones huérfanas (sin colaborador válido)
  async limpiarVacacionesHuerfanas() {
    try {
      console.log('🧹 Iniciando limpieza de vacaciones huérfanas...');
      
      // Obtener todos los colaboradores activos
      const colaboradoresSnapshot = await getDocs(collection(db, 'colaboradores'));
      const colaboradoresIds = colaboradoresSnapshot.docs.map(doc => doc.id);
      
      // Obtener todas las vacaciones
      const vacacionesSnapshot = await getDocs(collection(db, 'vacaciones'));
      const eliminados = [];
      
      for (const vacacionDoc of vacacionesSnapshot.docs) {
        const vacacion = vacacionDoc.data();
        
        // Si el colaborador de la vacación no existe, eliminar vacación
        if (!colaboradoresIds.includes(vacacion.colaboradorId)) {
          await deleteDoc(vacacionDoc.ref);
          eliminados.push(vacacionDoc.id);
        }
      }
      
      console.log(`✅ Eliminadas ${eliminados.length} vacaciones huérfanas`);
      return eliminados;
    } catch (error) {
      console.error('❌ Error limpiando vacaciones huérfanas:', error);
      return [];
    }
  }

  // Ejecutar limpieza completa automática
  async ejecutarLimpiezaCompleta() {
    try {
      console.log('🧹 Iniciando limpieza completa de la base de datos...');
      
      const resultados = {
        vacacionesVencidas: await this.limpiarVacacionesVencidas(),
        vacacionesHuerfanas: await this.limpiarVacacionesHuerfanas(),
        colaboradoresInactivos: await this.limpiarColaboradoresInactivos()
      };
      
      const totalEliminados = 
        resultados.vacacionesVencidas.length + 
        resultados.vacacionesHuerfanas.length + 
        resultados.colaboradoresInactivos.length;
      
      console.log(`✅ Limpieza completa finalizada. Total eliminados: ${totalEliminados}`);
      return resultados;
    } catch (error) {
      console.error('❌ Error en limpieza completa:', error);
      throw error;
    }
  }

  // Programar limpieza automática (llamar al inicializar la app)
  programarLimpiezaAutomatica() {
    // Ejecutar limpieza cada 24 horas
    const limpiezaInterval = setInterval(() => {
      this.ejecutarLimpiezaCompleta();
    }, 24 * 60 * 60 * 1000); // 24 horas en milisegundos

    // Ejecutar limpieza inicial después de 5 minutos
    setTimeout(() => {
      this.ejecutarLimpiezaCompleta();
    }, 5 * 60 * 1000); // 5 minutos

    return limpiezaInterval;
  }
}

const service = new FirebaseService();
export default service;
