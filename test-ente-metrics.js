const axios = require('axios');

async function testEnteMetrics() {
  const BASE_URL = 'http://localhost:3000';
  
  try {
    console.log('--- Probando Resumen Operativo por Ente ---');
    
    // 1. Login como ADMIN_ENTE (Miranda)
    console.log('1. Iniciando sesión como ADMIN_ENTE (Miranda)...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@miranda.gob.ve',
      password: 'miranda123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login exitoso.');

    // 2. Llamar al endpoint de resumen operativo
    console.log('2. Obteniendo resumen operativo...');
    const metricsResponse = await axios.get(`${BASE_URL}/entes/dashboard/operativo`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Métricas obtenidas:', JSON.stringify(metricsResponse.data, null, 2));

    // Validar estructura
    const { usuarios, expedientesEnProceso, expedientesTerminados, proveedores, compliance } = metricsResponse.data;
    if (
      usuarios && typeof usuarios.total === 'number' &&
      expedientesEnProceso && typeof expedientesEnProceso.total === 'number' &&
      expedientesTerminados && typeof expedientesTerminados.total === 'number' &&
      proveedores && typeof proveedores.total === 'number' &&
      compliance && typeof compliance.total === 'number'
    ) {
      console.log('🎉 Estructura de respuesta válida.');
    } else {
      console.error('❌ Estructura de respuesta inválida.');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.response ? error.response.data : error.message);
  }
}

testEnteMetrics();
