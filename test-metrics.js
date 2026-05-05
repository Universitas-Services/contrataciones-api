const axios = require('axios');

async function testMetrics() {
  const BASE_URL = 'http://localhost:3000';
  
  try {
    console.log('--- Probando Métricas de Universitas ---');
    
    // 1. Login como UNIVERSITAS
    console.log('1. Iniciando sesión como UNIVERSITAS...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@universitas.gob.ve',
      password: 'universitas123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login exitoso.');

    // 2. Llamar al endpoint de métricas
    console.log('2. Obteniendo métricas...');
    const metricsResponse = await axios.get(`${BASE_URL}/entes/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Métricas obtenidas:', JSON.stringify(metricsResponse.data, null, 2));

    // Validar estructura
    const { totalEntes, totalSupervisores, completados, porCompletar } = metricsResponse.data;
    if (
      typeof totalEntes === 'number' &&
      typeof totalSupervisores === 'number' &&
      typeof completados === 'number' &&
      typeof porCompletar === 'number'
    ) {
      console.log('🎉 Estructura de respuesta válida.');
    } else {
      console.error('❌ Estructura de respuesta inválida.');
    }

    // 3. Probar acceso denegado para otro rol
    console.log('3. Probando acceso denegado para ADMIN_ENTE...');
    const loginAdminEnte = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@miranda.gob.ve',
      password: 'miranda123'
    });
    
    const adminToken = loginAdminEnte.data.access_token;
    
    try {
      await axios.get(`${BASE_URL}/entes/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.error('❌ Error: ADMIN_ENTE pudo acceder a las métricas de UNIVERSITAS.');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Acceso denegado correctamente para ADMIN_ENTE.');
      } else {
        console.error('❌ Error inesperado:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.response ? error.response.data : error.message);
  }
}

testMetrics();
