import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import axios from 'axios';
const ImageModule = require('docxtemplater-image-module-free');

// Datos de prueba del usuario
const data = {
    test_ente_id: '995ed4b7-f233-4ccc-ac22-47b0454695da',
    test_logo_url: 'https://res.cloudinary.com/da86ka5ip/image/upload/v1770409279/universitas/entes/995ed4b7-f233-4ccc-ac22-47b0454695da/logo_1770409278702.png',
    test_ente_name: 'Alcaldía del Municipio Libertador'
};

const templatePath = path.resolve(__dirname, 'templates/manual-ente-base.docx');
console.log(`Cargando plantilla desde: ${templatePath}`);

if (!fs.existsSync(templatePath)) {
    console.error('❌ Plantilla no encontrada.');
    process.exit(1);
}

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

async function run() {
    console.log('Descargando imagen del logo...');
    let logoBuffer: Buffer;
    try {
        const response = await axios.get(data.test_logo_url, { responseType: 'arraybuffer' });
        logoBuffer = Buffer.from(response.data);
        console.log(`✅ Logo descargado: ${logoBuffer.length} bytes`);
    } catch (error) {
        console.error('❌ Error descargando logo:', error.message);
        process.exit(1);
    }

    const imageModule = new ImageModule({
        centered: false,
        getImage: (tagValue, tagName) => {
            console.log(`ImageModule requested image for tag: ${tagValue}`);
            // Simular lógica del servicio: siempre devolver el buffer pre-cargado si el tag coincide
            return logoBuffer;
        },
        getSize: () => [150, 150],
    });

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
    });

    doc.setData({
        nom_ente_contratante: data.test_ente_name,
        siglas_ente: 'AML',
        logo_ente: 'placeholder', // Activa el módulo
        nom_unidad_admin_financiera: 'Admin Test',
        nom_unidad_contratante: 'Compras Test',
        nom_unidad_tecnologia: 'Tech Test',
        fecha_generacion: '06/02/2026',
        anio: '2026'
    });

    try {
        doc.render();
        console.log('✅ Renderizado exitoso.');
    } catch (error) {
        console.error('❌ Error renderizando DOCX:', error);
        throw error;
    }

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    const outputPath = path.resolve(__dirname, 'test-output-manual.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Documento generado en: ${outputPath}`);
}

run().catch(console.error);
