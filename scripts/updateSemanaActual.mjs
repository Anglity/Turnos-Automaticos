#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import { calcularSemanaDeRotacion, obtenerLunesDelamSemana } from '../src/utils/fechas.js';

// Simple CLI para actualizar 'semanaActual' en Firestore
// Uso:
//   node scripts/updateSemanaActual.mjs --dry          -> muestra la semana calculada sin tocar Firebase
//   node scripts/updateSemanaActual.mjs                -> intenta actualizar Firestore usando firebase-admin

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');

function calcularSemanaHoy(fechaReferenciaStr = '2025-08-26') {
  const hoy = new Date();
  const lunesHoy = obtenerLunesDelamSemana(hoy);
  const fechaReferencia = new Date(fechaReferenciaStr);
  const numeroSemana = calcularSemanaDeRotacion(lunesHoy, fechaReferencia);
  return { numeroSemana, lunesHoy, fechaReferencia };
}

async function actualizarEnFirestore(numeroSemana) {
  // Usamos firebase-admin para actualización en backend (requiere GOOGLE_APPLICATION_CREDENTIALS)
  try {
    const admin = await import('firebase-admin');
    // Si no hay credenciales, firebase-admin lanzará error
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp();
    }
    const db = admin.firestore();
    const configRef = db.collection('configuracion').doc('general');
    await configRef.set({ semanaActual: numeroSemana, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log('✅ semanaActual actualizada en Firestore a:', numeroSemana);
  } catch (err) {
    console.error('❌ Error actualizando Firestore:', err.message || err);
    process.exitCode = 2;
  }
}

// Leer posible fecha referencia en firebase config local (opcional)
function obtenerFechaReferenciaDesdeArchivo() {
  try {
    const configPath = path.resolve(process.cwd(), 'src', 'services', 'firebaseService.js');
    const content = readFileSync(configPath, 'utf8');
    const m = content.match(/fechaReferencia:\s*'([0-9]{4}-[0-9]{2}-[0-9]{2})'/);
    if (m) return m[1];
  } catch (e) {
    // ignore
  }
  return '2025-08-26';
}

async function main() {
  const fechaRef = obtenerFechaReferenciaDesdeArchivo();
  const { numeroSemana, lunesHoy, fechaReferencia } = calcularSemanaHoy(fechaRef);
  console.log('📅 Hoy (lunes):', lunesHoy.toISOString().split('T')[0]);
  console.log('📌 Fecha referencia:', fechaReferencia.toISOString().split('T')[0]);
  console.log('🔁 Semana de rotación calculada:', numeroSemana);

  if (dry) {
    console.log('⚠️ Modo dry-run - no se actualizará Firebase');
    return;
  }

  // Intentar actualizar Firestore
  await actualizarEnFirestore(numeroSemana);
}

main();
