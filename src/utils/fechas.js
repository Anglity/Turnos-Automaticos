// Utilidades para cálculos de fechas y turnos
export const obtenerLunesDelamSemana = (fecha) => {
  const date = new Date(fecha);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const obtenerDomingoDeLaSemana = (fecha) => {
  const lunes = obtenerLunesDelamSemana(fecha);
  return new Date(lunes.getTime() + 6 * 24 * 60 * 60 * 1000);
};

export const calcularSemanaDeRotacion = (fechaConsulta, fechaReferencia) => {
  const lunes = obtenerLunesDelamSemana(fechaConsulta);
  const lunesReferencia = obtenerLunesDelamSemana(fechaReferencia);
  const diffTime = lunes - lunesReferencia;
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks + 1;
};

export const determinarGrupoEnNivel1 = (numeroSemana, grupoInicialNivel1) => {
  if (numeroSemana % 2 === 1) {
    return grupoInicialNivel1; // Semana impar
  } else {
    return grupoInicialNivel1 === 'A' ? 'B' : 'A'; // Semana par
  }
};

export const formatearFecha = (fecha) => {
  return fecha.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatearRangoSemana = (fechaInicio, fechaFin) => {
  return `${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`;
};
