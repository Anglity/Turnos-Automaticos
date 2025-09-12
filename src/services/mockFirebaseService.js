// Sistema temporal que simula Firebase hasta tener las credenciales reales
class MockFirebaseService {
  constructor() {
    this.data = {
      colaboradores: [
        { id: '1', nombre: 'JASON VARGAS', unidad: 'Infraestructura & Cloud', telefono: '(829) 662-4002', grupoRotacion: 'A', nivelActual: 1, activo: true },
        { id: '2', nombre: 'ELVIN REYES', unidad: 'Gestión de Datos', telefono: '(809) 641-5018', grupoRotacion: 'A', nivelActual: 1, activo: true },
        { id: '3', nombre: 'SERGIO GUERRERO', unidad: 'Comunicaciones', telefono: '(829) 345-5788', grupoRotacion: 'A', nivelActual: 1, activo: true },
        { id: '4', nombre: 'JUAN DOMINGUEZ', unidad: 'Comunicaciones', telefono: '(829) 345-5788', grupoRotacion: 'B', nivelActual: 2, activo: true },
        { id: '5', nombre: 'ANEUDY HERNANDEZ', unidad: 'Infraestructura & Cloud', telefono: '(829) 662-5518', grupoRotacion: 'B', nivelActual: 2, activo: true },
        { id: '6', nombre: 'CRISTIAN MELO', unidad: 'Gestión de Datos', telefono: '(809) 720-9800', grupoRotacion: 'B', nivelActual: 2, activo: true },
        { id: '7', nombre: 'MINERVA SANTANA', unidad: 'Infraestructura & Cloud', telefono: '(849) 635-9782', grupoRotacion: 'FIJO', nivelActual: 3, activo: true },
        { id: '8', nombre: 'VLADY REINOSO', unidad: 'Operaciones TI', telefono: '(829) 345-1196', grupoRotacion: 'FIJO', nivelActual: 3, activo: true }
      ],
      vacaciones: [],
      configuracion: {
        fechaReferencia: '2025-08-26',
        grupoInicialNivel1: 'A',
        semanaActual: 3
      }
    };
    this.nextId = 9;
    console.log('🔄 Mock Firebase Service inicializado');
  }

  async getColaboradores() {
    console.log('📥 Mock Firebase: Cargando colaboradores...');
    return this.data.colaboradores.filter(c => c.activo);
  }

  async addColaborador(colaborador) {
    console.log('🔥 Mock Firebase: Agregando colaborador...', colaborador);
    const newColaborador = {
      id: this.nextId.toString(),
      ...colaborador,
      activo: true,
      createdAt: new Date().toISOString()
    };
    this.data.colaboradores.push(newColaborador);
    this.nextId++;
    return newColaborador.id;
  }

  async updateColaborador(id, colaborador) {
    console.log('🔥 Mock Firebase: Actualizando colaborador...', id, colaborador);
    const index = this.data.colaboradores.findIndex(c => c.id === id);
    if (index !== -1) {
      this.data.colaboradores[index] = {
        ...this.data.colaboradores[index],
        ...colaborador,
        updatedAt: new Date().toISOString()
      };
    }
    return id;
  }

  async getVacaciones() {
    console.log('📥 Mock Firebase: Cargando vacaciones...');
    return this.data.vacaciones.filter(v => v.activo);
  }

  async addVacacion(vacacion) {
    console.log('🔥 Mock Firebase: Agregando vacación...', vacacion);
    const newVacacion = {
      id: this.nextId.toString(),
      ...vacacion,
      activo: true,
      createdAt: new Date().toISOString()
    };
    this.data.vacaciones.push(newVacacion);
    this.nextId++;
    console.log('✅ Mock Firebase: Vacación agregada con ID:', newVacacion.id);
    return newVacacion.id;
  }

  async updateVacacion(id, vacacion) {
    console.log('🔥 Mock Firebase: Actualizando vacación...', id, vacacion);
    const index = this.data.vacaciones.findIndex(v => v.id === id);
    if (index !== -1) {
      this.data.vacaciones[index] = {
        ...this.data.vacaciones[index],
        ...vacacion,
        updatedAt: new Date().toISOString()
      };
    }
    return id;
  }

  async deleteVacacion(id) {
    console.log('🔥 Mock Firebase: Eliminando vacación...', id);
    const index = this.data.vacaciones.findIndex(v => v.id === id);
    if (index !== -1) {
      this.data.vacaciones[index] = {
        ...this.data.vacaciones[index],
        activo: false,
        deletedAt: new Date().toISOString()
      };
    }
    return id;
  }

  async getConfiguracion() {
    console.log('📥 Mock Firebase: Cargando configuración...');
    return this.data.configuracion;
  }

  async setConfiguracion(clave, valor) {
    console.log('🔥 Mock Firebase: Guardando configuración...', clave, valor);
    this.data.configuracion[clave] = valor;
    return valor;
  }

  async inicializarDatos() {
    console.log('🌱 Mock Firebase: Datos ya inicializados');
    return;
  }

  emitChange(tipo, accion, datos) {
    console.log('📡 Mock Firebase: Cambio emitido:', tipo, accion, datos);
    window.dispatchEvent(new CustomEvent('turnosDataChanged', {
      detail: { tipo, accion, datos }
    }));
  }
}

export default MockFirebaseService;
