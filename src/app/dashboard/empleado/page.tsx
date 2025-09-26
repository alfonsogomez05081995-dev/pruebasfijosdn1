'use client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw, Undo2, AlertTriangle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, ChangeEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getMyAssignedAssets, confirmAssetReceipt, rejectAssetReceipt, submitReplacementRequest, Asset, getAssetById, initiateDevolutionProcess } from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EmpleadoPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [assetToActOn, setAssetToActOn] = useState<Asset | null>(null);
  
  // State for forms
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [imageFile, setImageFile] = useState<File | undefined>();

  useEffect(() => {
    if (!loading && (!userData || !['master', 'empleado'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAssets = useCallback(async () => {
    if (userData?.id) {
        try {
            const assets = await getMyAssignedAssets(userData.id);
            setAssignedAssets(assets);
        } catch(error) {
            console.error("Error fetching assets:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar sus activos.' });
        }
    }
  }, [userData, toast]);

  useEffect(() => {
    if (userData) {
      fetchAssets();
    }
  }, [userData, fetchAssets]);

  const handleConfirmReceipt = async (id: string) => {
    try {
      await confirmAssetReceipt(id);
      toast({ title: "Recepción Confirmada", description: "El estado del activo ha sido actualizado a 'activo'." });
      await fetchAssets();
    } catch (error) {
      console.error("Error confirmando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo confirmar la recepción." });
    }
  };

  const handleOpenRejectionDialog = (asset: Asset) => {
    setAssetToActOn(asset);
    setRejectionDialogOpen(true);
  };

  const handleRejectReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetToActOn || !rejectionReason) {
      toast({ variant: "destructive", title: "Error", description: "Debe proporcionar un motivo de rechazo." });
      return;
    }
    try {
      await rejectAssetReceipt(assetToActOn.id, rejectionReason);
      toast({ title: "Recepción Rechazada", description: "El activo ha sido marcado como 'en disputa'. Logística será notificada." });
      setRejectionDialogOpen(false);
      setRejectionReason('');
      await fetchAssets();
    } catch (error) {
      console.error("Error rechazando recepción:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar la recepción." });
    }
  };
  
  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // ... (implementation remains the same)
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    // ... (implementation remains the same)
  };

  const handleInitiateDevolution = async () => {
    if (!userData) return;
    try {
      await initiateDevolutionProcess(userData.id, userData.name);
      toast({ title: "Proceso de Devolución Iniciado", description: "Tus activos han sido marcados como 'en devolución'. Logística verificará la entrega." });
      await fetchAssets();
    } catch (error: any) {
      console.error("Error iniciando devolución:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo iniciar el proceso." });
    }
  };

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Portal del Empleado</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Replacement Request Dialog */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>{/* ... */}</Dialog>
        
        {/* Asset Return Alert */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Card className="cursor-pointer hover:border-destructive">
                <CardHeader className="flex-row items-center gap-4">
                  <Undo2 className="h-8 w-8 text-destructive" />
                  <div>
                    <CardTitle>Devolución de Activos</CardTitle>
                    <CardDescription>
                      Inicie el proceso de devolución al salir de la empresa.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-destructive" />¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción iniciará el proceso de devolución de TODOS sus activos asignados. 
                Es un paso requerido para generar su paz y salvo. No podrá deshacer esta acción.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleInitiateDevolution}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* My Assigned Assets Table */}
      <Card className="mt-6">{/* ... */}</Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>{/* ... */}</Dialog>
    </>
  );
}