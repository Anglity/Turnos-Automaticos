// Configuración de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// CONFIGURACIÓN TEMPORAL PARA DESARROLLO
// REEMPLAZAR CON TUS CREDENCIALES REALES DE FIREBASE
const firebaseConfig = {
apiKey: "AIzaSyCUj0HdtTco_DHQ_lyOUUWCL2abugN4-0Y",
  authDomain: "turnos-automaticos.firebaseapp.com",
  projectId: "turnos-automaticos",
  storageBucket: "turnos-automaticos.firebasestorage.app",
  messagingSenderId: "554176030802",
  appId: "1:554176030802:web:1575df9de5c6ce0afa178b",
  measurementId: "G-0WYREVDTJZ"
};

// ⚠️ INSTRUCCIONES:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto llamado "turnos-banfondesa"
// 3. Activa Firestore Database en modo de prueba
// 4. Registra una Web App
// 5. Copia las credenciales reales y reemplaza las de arriba

// Inicializar Firebase
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('🔥 Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  console.log('ℹ️ Usando modo demostración - configurar credenciales reales');
  // En modo demo, no tendremos una BD real
}

export { db };
export default app;
