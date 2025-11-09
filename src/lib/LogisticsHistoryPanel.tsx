// src/components/logistics/LogisticsHistoryPanel.tsx

'use client'; // Directiva para componentes de cliente en Next.js

import React, { useState, useEffect } from 'react';
// Importa el servicio para obtener las solicitudes y el tipo de dato correspondiente.
import { getAllAssignmentRequests } from '@/lib/services';
import type { AssignmentRequest } from '@/lib/types';

/**
 * Componente LogisticsHistoryPanel.
 * Muestra una tabla con el historial completo de todas las solicitudes de asignación
 * realizadas en el sistema.
 */
export default function LogisticsHistoryPanel() {
    // --- Estados del Componente ---
    const [requests, setRequests] = useState<AssignmentRequest[]>([]); // Almacena la lista de solicitudes.
    const [loading, setLoading] = useState(true); // Indica si los datos se están cargando.
    const [error, setError] = useState(''); // Almacena un mensaje de error si la carga falla.

    // `useEffect` para cargar los datos del historial cuando el componente se monta.
    useEffect(() => {
        /**
         * Función asíncrona para obtener el historial de solicitudes desde el backend.
         */
        const fetchRequests = async () => {
            try {
                setLoading(true);
                // Llama al servicio para obtener todas las solicitudes.
                // Nota: La función original en el componente de logística tenía paginación,
                // esta versión parece obtener todos los datos de una vez.
                const data = await getAllAssignmentRequests();
                setRequests(data);
            } catch (err: any) {
                setError('Error al cargar el historial de solicitudes.');
                console.error(err); // Muestra el error completo en la consola para depuración.
            } finally {
                setLoading(false); // Finaliza el estado de carga.
            }
        };

        fetchRequests();
    }, []); // El array vacío asegura que el efecto se ejecute solo una vez.

    // --- Renderizado Condicional ---
    if (loading) return <p>Cargando historial...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    // --- Renderizado Principal ---
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Historial de Solicitudes</h2>
            <p className="text-sm text-gray-600 mb-4">Historial completo de todas las solicitudes de asignación.</p>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* Cabeceras de la tabla */}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha de Solicitud
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha de Envío
                            </th>
                            {/* ... otras cabeceras ... */}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Itera sobre cada solicitud y la renderiza como una fila en la tabla. */}
                        {requests.map((request) => (
                            <tr key={request.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {request.formattedDate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {request.formattedSentDate || 'Pendiente'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {request.assetName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {request.employeeName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {/* Badge de estado con colores condicionales para una mejor visualización. */}
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        request.status === 'enviado' ? 'bg-green-100 text-green-800' :
                                        request.status === 'pendiente de envío' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {request.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {request.trackingNumber || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {request.carrier || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}