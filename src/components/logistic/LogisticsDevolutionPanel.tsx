'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    getDevolutionProcesses, 
    verifyAssetReturn, 
    decommissionAsset,
    completeDevolutionProcess,
} from '@/lib/services';
import type { DevolutionProcess } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Archive, AlertTriangle, Undo2, PackageCheck } from 'lucide-react';

type AssetInDevolution = DevolutionProcess['assets'][0];

interface DecommissionModalProps {
    asset: AssetInDevolution;
    processId: string;
    onClose: () => void;
    onDecommission: (processId: string, assetId: string, justification: string, imageFile: File) => Promise<void>;
}

const DecommissionModal: React.FC<DecommissionModalProps> = ({ asset, processId, onClose, onDecommission }) => {
    const [justification, setJustification] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!justification.trim() || !imageFile) {
            toast({ variant: 'destructive', title: 'Error', description: 'La justificación y la imagen son obligatorias.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onDecommission(processId, asset.id, justification, imageFile);
            toast({ title: 'Éxito', description: 'Activo dado de baja correctamente.' });
            onClose();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'Ocurrió un error al dar de baja el activo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dar de Baja Activo: {asset.name}</DialogTitle>
                    <DialogDescription>
                        Proporcione una justificación y una imagen de evidencia para dar de baja este activo.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Justificación detallada..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        required
                    />
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                        required
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="destructive" disabled={isSubmitting}>
                            {isSubmitting ? 'Procesando...' : 'Confirmar Baja'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

interface LogisticsDevolutionPanelProps {
  onAssetClick: (assetId: string) => void;
}

export default function LogisticsDevolutionPanel({ onAssetClick }: LogisticsDevolutionPanelProps) {
    const [processes, setProcesses] = useState<DevolutionProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssetForDecommission, setSelectedAssetForDecommission] = useState<AssetInDevolution | null>(null);
    const [processIdForModal, setProcessIdForModal] = useState('');
    const { toast } = useToast();
    const logisticsActor = { id: 'logistica_user_id', name: 'Usuario de Logística' };

    const fetchProcesses = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getDevolutionProcesses();
            setProcesses(data);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar los procesos de devolución.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchProcesses();
    }, [fetchProcesses]);

    const handleReturnToStock = async (processId: string, assetId: string) => {
        try {
            await verifyAssetReturn(processId, assetId, logisticsActor);
            toast({ title: 'Éxito', description: 'Activo retornado al stock con éxito.' });
            fetchProcesses();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    const handleDecommission = async (processId: string, assetId: string, justification: string, imageFile: File) => {
        await decommissionAsset(processId, assetId, justification, imageFile, logisticsActor);
        fetchProcesses();
    };

    const handleCompleteProcess = async (processId: string) => {
        try {
            await completeDevolutionProcess(processId, logisticsActor);
            toast({ title: 'Proceso Completado', description: 'El proceso de devolución ha sido completado.' });
            fetchProcesses();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    if (loading) return <p>Cargando procesos de devolución...</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Procesos de Devolución en Curso</CardTitle>
                <CardDescription>Verifique los activos devueltos por los empleados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {processes.length === 0 ? (
                    <p>No hay procesos de devolución en curso.</p>
                ) : (
                    processes.map(process => (
                        <Card key={process.id} className="p-4">
                            <CardHeader className="p-2">
                                <CardTitle className="text-base">{process.employeeName}</CardTitle>
                                <CardDescription>Iniciado: {process.formattedDate}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-2">
                                <ul className="space-y-2">
                                    {process.assets.map(asset => (
                                        <li key={asset.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                            <Button variant="link" className="p-0 h-auto" onClick={() => onAssetClick(asset.id)}>
                                                {asset.name} (Serial: {asset.serial || 'N/A'})
                                            </Button>
                                            {asset.verified ? (
                                                <Badge variant="default"><CheckCircle className="h-4 w-4 mr-1" />Verificado</Badge>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleReturnToStock(process.id, asset.id)}>
                                                        <Undo2 className="h-4 w-4 mr-1" /> Retornar
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => {
                                                        setSelectedAssetForDecommission(asset);
                                                        setProcessIdForModal(process.id);
                                                    }}>
                                                        <Archive className="h-4 w-4 mr-1" /> Dar de Baja
                                                    </Button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            {process.assets.every(a => a.verified) && (
                                <CardFooter className="p-2 justify-end">
                                    <Button onClick={() => handleCompleteProcess(process.id)}>
                                        <PackageCheck className="h-4 w-4 mr-2" /> Completar Proceso
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                )}
            </CardContent>
            {selectedAssetForDecommission && (
                <DecommissionModal 
                    asset={selectedAssetForDecommission}
                    processId={processIdForModal}
                    onClose={() => setSelectedAssetForDecommission(null)}
                    onDecommission={handleDecommission}
                />
            )}
        </Card>
    );
}
