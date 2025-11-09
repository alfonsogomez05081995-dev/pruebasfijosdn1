// Indica que este componente se ejecuta en el lado del cliente.
'use client';

// Importa las funciones y hooks necesarios de React.
import React, { useState, useEffect } from 'react';
// Importa la función para obtener todas las solicitudes de asignación.
import { getAllAssignmentRequests } from '@/lib/services';
// Importa el tipo de dato para las solicitudes de asignación.
import type { AssignmentRequest } from '@/lib/types';

// Define el componente del panel de historial de logística.
export default function LogisticsHistoryPanel() {
    // Estados para las solicitudes, el estado de carga y los errores.
    const [requests, setRequests] = useState<AssignmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Efecto para obtener las solicitudes de asignación cuando el componente se monta.
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);
                // Llama a la función de servicio para obtener todas las solicitudes de asignación.
                const data = await getAllAssignmentRequests();
                setRequests(data);
            } catch (err: any) {
                // Establece un mensaje de error si la obtención de datos falla.
                setError('Error al cargar el historial de solicitudes.');
            } finally {
                // Finaliza el estado de carga.
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    // Muestra un mensaje de carga mientras se obtienen los datos.
    if (loading) return <p>Cargando historial...</p>;
    // Muestra un mensaje de error si la obtención de datos falla.
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        // Contenedor principal del panel.
        <div className="bg-white p-6 rounded-lg shadow">
            {/* Título y descripción del panel. */}
            <h2 className="text-xl font-semibold mb-4">Historial de Solicitudes</h2>
            <p className="text-sm text-gray-600 mb-4">Historial completo de todas las solicitudes de asignación.</p>
            {/* Contenedor de la tabla con desplazamiento horizontal. */}
            <div className="overflow-x-auto">
                {/* Tabla para mostrar el historial de solicitudes. */}
                <table className="min-w-full divide-y divide-gray-200">
                    {/* Encabezado de la tabla. */}
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha de Solicitud
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha de Envío
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Activo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Empleado
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Guía
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transportadora
                            </th>
                        </tr>
                    </thead>
                    {/* Cuerpo de la tabla. */}
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Mapea las solicitudes y las muestra en filas de la tabla. */}
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
                                    {/* Muestra el estado de la solicitud con un color de fondo diferente según el estado. */}
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