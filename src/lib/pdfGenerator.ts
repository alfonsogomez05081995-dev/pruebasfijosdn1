// src/lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { DevolutionProcess } from './types';

// Aplica el plugin autoTable a la instancia de jsPDF.
// Esto es necesario para que el método `doc.autoTable` esté disponible.
applyPlugin(jsPDF);

/**
 * Convierte un ArrayBuffer a una cadena Base64.
 * @param buffer El ArrayBuffer a convertir.
 * @returns La cadena en formato Base64.
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Genera un certificado de Paz y Salvo en formato PDF.
 * Carga de forma asíncrona el logo de la empresa desde /logo.png.
 * @param process - El proceso de devolución completado.
 * @param assetsWithStatus - Un array de los activos del proceso con su estado final.
 */
export const generatePazYSalvoPDF = async (
  process: DevolutionProcess,
  assetsWithStatus: { name: string; serial?: string; finalStatus: string }[]
): Promise<void> => {
  const doc = new jsPDF();
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    // Carga la imagen del logo desde la carpeta `public`.
    // La imagen debe existir en `public/logo.png`.
    const response = await fetch('/logo.png');
    if (response.ok) {
      const imageBuffer = await response.arrayBuffer();
      const logoBase64 = arrayBufferToBase64(imageBuffer);
      // Añade el logo al documento.
      doc.addImage(logoBase64, 'PNG', 15, 15, 30, 30);
    } else {
      console.warn('No se pudo cargar el logo desde /logo.png. El PDF se generará sin él.');
    }
  } catch (error) {
    console.error('Error al cargar o procesar el logo para el PDF:', error);
  }

  // Título del documento
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Certificado de Paz y Salvo', 105, 30, { align: 'center' });

  // Información del empleado
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Fecha de expedición: ${dateStr}`, 20, 55);
  doc.text(`Empleado: ${process.employeeName}`, 20, 65);
  doc.text(`ID de Empleado: ${process.employeeId}`, 20, 75);

  // Párrafo de certificación
  doc.setFontSize(11);
  const paragraph = `Por medio del presente documento, la empresa certifica que el empleado mencionado anteriormente ha completado satisfactoriamente el proceso de devolución de los activos que tenía a su cargo. A continuación, se detallan los activos devueltos y su estado final verificado por el área de logística.`;
  const splitParagraph = doc.splitTextToSize(paragraph, 170);
  doc.text(splitParagraph, 20, 90);

  // Tabla de activos devueltos
  (doc as any).autoTable({
    startY: 110,
    head: [["Activo", "Serial", "Estado Final"]],
    body: assetsWithStatus.map(asset => [
      asset.name,
      asset.serial || 'N/A',
      asset.finalStatus,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [28, 40, 51], // Azul oscuro para la cabecera
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // Gris claro para filas alternas
    },
  });

  // Pie de página y firma
  const finalY = (doc as any).lastAutoTable.finalY || 160;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento se genera automáticamente y es válido sin firma y sello.', 105, finalY + 20, { align: 'center' });
  doc.text('FijosDN - Sistema de Gestión de Activos', 105, finalY + 28, { align: 'center' });

  // Guardar el PDF con un nombre de archivo único
  doc.save(`Paz_y_Salvo_${process.employeeName.replace(/ /g, '_')}_${process.id}.pdf`);
};
