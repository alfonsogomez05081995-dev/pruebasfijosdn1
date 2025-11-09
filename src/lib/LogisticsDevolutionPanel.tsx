/**
 * @file Este archivo contiene un componente de React para gestionar el panel de devoluciones de logística.
 * Parece ser una implementación autónoma y de ejemplo, ya que la lógica principal
 * también se encuentra en la página del dashboard de logística.
 */

'use client'; // Directiva para componentes de cliente en Next.js

import React, { useState, useEffect } from 'react';
// Importa los servicios de Firebase para interactuar con la base de datos.
import { 
    getDevolutionProcesses, 
    verifyAssetReturn, 
    decommissionAsset,
} from '@/lib/services';
// Importa los tipos de datos para asegurar la consistencia.
import type { DevolutionProcess } from '@/lib/types';
// Importa utilidades, como el formateador de fechas.
import { formatFirebaseTimestamp } from '@/lib/utils';

// Objeto de ejemplo para el actor que realiza la acción (debería ser dinámico).
const logisticsActor = { id: 'logistica_user_id', name: 'Usuario de Logística' };

// Define el tipo para un activo individual dentro de un proceso de devolución.
type AssetInDevolution = DevolutionProcess['assets'][0];

// Define las propiedades que espera el componente del modal de "Dar de Baja".
interface DecommissionModalProps {
    asset: AssetInDevolution;
    processId: string;
    onClose: () => void;
    onDecommission: (processId: string, assetId: string, justification: string, imageFile: File) => Promise<void>;
}

/**
 * Componente DecommissionModal.
 * Un diálogo modal que permite al usuario de logística dar de baja un activo,
 * requiriendo una justificación y una imagen de evidencia.
 */
const DecommissionModal: React.FC<DecommissionModalProps> = ({ asset, processId, onClose, onDecommission }) => {
    // Estados para el formulario del modal.
    const [justification, setJustification] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /**
     * Maneja el envío del formulario para dar de baja el activo.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!justification.trim() || !imageFile) {
            setError('La justificación y la imagen son obligatorias.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await onDecommission(processId, asset.id, justification, imageFile);
            onClose(); // Cierra el modal si la operación es exitosa.
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al dar de baja el activo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Dar de Baja Activo: {asset.name}</h3>
                <form onSubmit={handleSubmit}>
                    {/* ... (campos del formulario para justificación e imagen) ... */}
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-md disabled:bg-red-300">
                            {isSubmitting ? 'Procesando...' : 'Confirmar Baja'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Componente principal LogisticsDevolutionPanel.
 * Muestra una lista de los procesos de devolución iniciados por los empleados
 * y permite al personal de logística verificar los activos devueltos.
 */
export default function LogisticsDevolutionPanel() {
    // Estados para manejar los datos y la UI del panel.
    const [processes, setProcesses] = useState<DevolutionProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAssetForDecommission, setSelectedAssetForDecommission] = useState<AssetInDevolution | null>(null);
    const [processIdForModal, setProcessIdForModal] = useState('');

    /**
     * Obtiene los procesos de devolución desde el backend.
     */
    const fetchProcesses = async () => {
        try {
            setLoading(true);
            const data = await getDevolutionProcesses();
            setProcesses(data);
        } catch (err: any) {
            setError('Error al cargar los procesos de devolución.');
        } finally {
            setLoading(false);
        }
    };

    // `useEffect` para cargar los datos cuando el componente se monta.
    useEffect(() => {
        fetchProcesses();
    }, []);

    /**
     * Maneja la acción de retornar un activo al stock.
     * @param {string} processId - El ID del proceso de devolución.
     * @param {string} assetId - El ID del activo a retornar.
     */
    const handleReturnToStock = async (processId: string, assetId: string) => {
        if (!confirm('¿Está seguro de que desea retornar este activo al stock?')) return;
        try {
            await verifyAssetReturn(processId, assetId);
            alert('Activo retornado al stock con éxito.');
            fetchProcesses(); // Recarga la lista para reflejar el cambio.
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    /**
     * Maneja la acción de dar de baja un activo.
     */
    const handleDecommission = async (processId: string, assetId: string, justification: string, imageFile: File) => {
        await decommissionAsset(processId, assetId, justification, imageFile, logisticsActor);
        alert('Activo dado de baja con éxito.');
        fetchProcesses(); // Recarga la lista.
    };

    // Renderizado condicional basado en el estado de carga y error.
    if (loading) return <p>Cargando procesos de devolución...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    // Renderizado principal del panel.
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Procesos de Devolución en Curso</h2>
            {processes.length === 0 ? (
                <p>No hay procesos de devolución en curso.</p>
            ) : (
                <div className="space-y-6">
                    {/* Itera sobre cada proceso de devolución. */}
                    {processes.map(process => (
                        <div key={process.id} className="border rounded-lg p-4">
                            <h3 className="font-bold">{process.employeeName}</h3>
                            <p className="text-sm text-gray-500">Iniciado: {process.formattedDate}</p>
                            <ul className="mt-2 space-y-2">
                                {/* Itera sobre cada activo dentro del proceso. */}
                                {process.assets.map(asset => (
                                    <li key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                        <div>
                                            <p>{asset.name} (Serial: {asset.serial || 'N/A'})</p>
                                        </div>
                                        {asset.verified ? (
                                            <span className="text-green-600 font-semibold">Verificado</span>
                                        ) : (
                                            // Muestra los botones de acción si el activo no ha sido verificado.
                                            <div className="flex gap-2">
                                                <button onClick={() => handleReturnToStock(process.id, asset.id)} className="...">
                                                    Retornar a Stock
                                                </button>
                                                <button onClick={() => { setSelectedAssetForDecommission(asset); setProcessIdForModal(process.id); }} className="...">
                                                    Dar de Baja
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {/* Renderiza el modal de "Dar de Baja" si hay un activo seleccionado. */}
            {selectedAssetForDecommission && (
                <DecommissionModal 
                    asset={selectedAssetForDecommission}
                    processId={processIdForModal}
                    onClose={() => setSelectedAssetForDecommission(null)}
                    onDecommission={handleDecommission}
                />
            )}
        </div>
    );
}