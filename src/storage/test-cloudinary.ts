import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env explícitamente desde la raíz del proyecto
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Cargando .env desde: ${envPath}`);
dotenv.config({ path: envPath });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('--- Probando Credenciales de Cloudinary ---');
console.log(`Cloud Name: ${cloudName}`);
console.log(`API Key: ${apiKey}`);
console.log(`API Secret: ${apiSecret ? apiSecret.slice(0, 5) + '...' + apiSecret.slice(-5) : 'UNDEFINED'}`);
console.log(`API Secret Length: ${apiSecret ? apiSecret.length : 0}`);

if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ ERROR: Faltan variables de entorno.');
    process.exit(1);
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

// Intentar generar una firma de prueba (no requiere llamada de red, pero valida la configuración local sdk)
try {
    const signature = cloudinary.utils.api_sign_request(
        { timestamp: Math.floor(Date.now() / 1000), public_id: 'test' },
        apiSecret
    );
    console.log(`✅ Firma generada localmente: ${signature}`);
    console.log('La configuración del SDK parece correcta (sintácticamente).');
} catch (error) {
    console.error('❌ Error generando firma:', error);
}

// Intentar una llamada real (ping)
console.log('Intentando conectar con Cloudinary (ping)...');
cloudinary.api.ping((error, result) => {
    if (error) {
        console.error('❌ ERROR DE CONEXIÓN O CREDENCIALES:', error);
        console.error('Detalles:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ CONEXIÓN EXITOSA:', result);
    }
});
