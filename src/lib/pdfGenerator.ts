// src/lib/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DevolutionProcess } from './types';

/**
 * Genera un certificado de Paz y Salvo en formato PDF.
 * @param process - El proceso de devolución completado.
 * @param assetsWithStatus - Un array de los activos del proceso con su estado final.
 */
export const generatePazYSalvoPDF = (
  process: DevolutionProcess,
  assetsWithStatus: { name: string; serial?: string; finalStatus: string }[]
) => {
  const doc = new jsPDF();
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Título del documento
  doc.setFontSize(18);
  doc.text('Certificado de Paz y Salvo', 105, 20, { align: 'center' });

  // Información del empleado y fecha
  doc.setFontSize(12);
  doc.text(`Fecha de expedición: ${dateStr}`, 20, 40);
  doc.text(`Empleado: ${process.employeeName}`, 20, 50);
  doc.text(`ID de Empleado: ${process.employeeId}`, 20, 60);

  // Párrafo de certificación
  doc.setFontSize(11);
  const paragraph = `Por medio del presente documento, la empresa certifica que el empleado mencionado anteriormente ha completado satisfactoriamente el proceso de devolución de los activos que tenía a su cargo. A continuación, se detallan los activos devueltos y su estado final verificado por el área de logística.`;
  const splitParagraph = doc.splitTextToSize(paragraph, 170);
  doc.text(splitParagraph, 20, 75);

  // Tabla de activos devueltos
  const tableColumn = ["Activo", "Serial", "Estado Final"];
  const tableRows: (string | undefined)[][] = [];

  assetsWithStatus.forEach(asset => {
    const assetData = [
      asset.name,
      asset.serial || 'N/A',
      asset.finalStatus,
    ];
    tableRows.push(assetData);
  });

  autoTable(doc, {
    startY: 100,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [22, 160, 133] }, // Color verde azulado
  });

  // Pie de página y firma
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(10);
  doc.text('Este documento se genera automáticamente y es válido sin firma y sello.', 105, finalY + 20, { align: 'center' });
  doc.text('FijosDN - Sistema de Gestión de Activos', 105, finalY + 28, { align: 'center' });

  // Guardar el PDF
  doc.save(`Paz_y_Salvo_${process.employeeName.replace(/ /g, '_')}.pdf`);
};
