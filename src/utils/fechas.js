// Utilidades para cálculos de fechas y turnos
// Nota: parseamos cadenas 'YYYY-MM-DD' como fechas locales para evitar
// desplazamientos por zona horaria que afectan al cálculo de semanas.
const toLocalDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === 'string') {
    // Manejar formato YYYY-MM-DD explícitamente
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d);
    }
    // Fallback: dejar que Date trate formatos con timezone si los hay
    return new Date(input);
  }
  // Otros tipos (timestamp)
  return new Date(input);
};

export const obtenerLunesDelamSemana = (fecha) => {
  const date = toLocalDate(fecha) || toLocalDate(new Date());
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
};

export const obtenerDomingoDeLaSemana = (fecha) => {
  const lunes = obtenerLunesDelamSemana(fecha);
  return new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
};

export const calcularSemanaDeRotacion = (fechaConsulta, fechaReferencia) => {
  const lunes = obtenerLunesDelamSemana(fechaConsulta);
  const lunesReferencia = obtenerLunesDelamSemana(fechaReferencia);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  // Convertir a timestamps de medianoche local para evitar offsets
  const t1 = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate()).getTime();
  const t2 = new Date(lunesReferencia.getFullYear(), lunesReferencia.getMonth(), lunesReferencia.getDate()).getTime();
  const diffWeeks = Math.floor((t1 - t2) / msPerWeek);
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

// Obtener fecha actual en formato YYYY-MM-DD sin problemas de zona horaria
export const obtenerFechaHoyLocal = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};
