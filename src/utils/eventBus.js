// Sistema de eventos globales para actualizaciones en tiempo real
class EventBus {
  constructor() {
    this.events = {};
  }

  // Suscribirse a un evento
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  // Emitir un evento
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  // Remover todos los listeners de un evento
  off(event) {
    delete this.events[event];
  }
}

// Instancia global del bus de eventos
const eventBus = new EventBus();

// Eventos predefinidos para la aplicación
export const EVENTS = {
  COLABORADORES_UPDATED: 'colaboradores_updated',
  VACACIONES_UPDATED: 'vacaciones_updated',
  TURNOS_UPDATED: 'turnos_updated',
  DATA_CHANGED: 'data_changed'
};

export default eventBus;
