// Este es un archivo de ejemplo, puedes llamarlo 'LogisticsDevolutionPanel.tsx'
// y usarlo en tu dashboard de logística.

'use client'; // Directiva para componentes de cliente en Next.js

import React, { useState, useEffect } from 'react';
import { 
    getDevolutionProcesses, 
    verifyAssetReturn, 
    decommissionAsset,
} from '@/lib/services';
import type { DevolutionProcess } from '@/lib/types';
import { formatFirebaseTimestamp } from '@/lib/utils';

// Suponiendo que tienes un objeto 'actor' con el usuario de logística actual
const logisticsActor = { id: 'logistica_user_id', name: 'Usuario de Logística' };

// El tipo para un activo dentro de un proceso de devolución
type AssetInDevolution = DevolutionProcess['assets'][0];

interface DecommissionModalProps {
    asset: AssetInDevolution;
    processId: string;
    onClose: () => void;
    onDecommission: (processId: string, assetId: string, justification: string, imageFile: File) => Promise<void>;
}

// Componente para el modal de "Dar de Baja"
const DecommissionModal: React.FC<DecommissionModalProps> = ({ asset, processId, onClose, onDecommission }) => {
    const [justification, setJustification] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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
            onClose();
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
                    <div className="mb-4">
                        <label htmlFor="justification" className="block text-sm font-medium text-gray-700">Motivo / Justificación</label>
                        <textarea
                            id="justification"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows={3}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700">Foto de Evidencia</label>
                        <input
                            type="file"
                            id="imageFile"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            required
                        />
                    </div>
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

export default function LogisticsDevolutionPanel() {
    const [processes, setProcesses] = useState<DevolutionProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAssetForDecommission, setSelectedAssetForDecommission] = useState<AssetInDevolution | null>(null);
    const [processIdForModal, setProcessIdForModal] = useState('');

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

    useEffect(() => {
        fetchProcesses();
    }, []);

    const handleReturnToStock = async (processId: string, assetId: string) => {
        if (!confirm('¿Está seguro de que desea retornar este activo al stock?')) return;
        try {
            await verifyAssetReturn(processId, assetId);
            alert('Activo retornado al stock con éxito.');
            fetchProcesses(); // Recargar la lista
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDecommission = async (processId: string, assetId: string, justification: string, imageFile: File) => {
        await decommissionAsset(processId, assetId, justification, imageFile, logisticsActor);
        alert('Activo dado de baja con éxito.');
        fetchProcesses(); // Recargar la lista
    };

    if (loading) return <p>Cargando procesos de devolución...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Procesos de Devolución en Curso</h2>
            {processes.length === 0 ? (
                <p>No hay procesos de devolución en curso.</p>
            ) : (
                <div className="space-y-6">
                    {processes.map(process => (
                        <div key={process.id} className="border rounded-lg p-4">
                            <h3 className="font-bold">{process.employeeName}</h3>
                            <p className="text-sm text-gray-500">Iniciado: {process.formattedDate}</p>
                            <ul className="mt-2 space-y-2">
                                {process.assets.map(asset => (
                                    <li key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                        <div>
                                            <p>{asset.name} (Serial: {asset.serial || 'N/A'})</p>
                                        </div>
                                        {asset.verified ? (
                                            <span className="text-green-600 font-semibold">Verificado</span>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleReturnToStock(process.id, asset.id)}
                                                    className="text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                                                >
                                                    Retornar a Stock
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedAssetForDecommission(asset);
                                                        setProcessIdForModal(process.id);
                                                    }}
                                                    className="text-sm bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                                                >
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