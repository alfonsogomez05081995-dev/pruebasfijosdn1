'use client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Send, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { addAsset, getAssignmentRequests, processAssignmentRequest, getDevolutionProcesses, verifyAssetReturn, completeDevolutionProcess, AssignmentRequest, AssetType, DevolutionProcess } from "@/lib/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LogisticaPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [assignmentRequests, setAssignmentRequests] = useState<AssignmentRequest[]>([]);
  const [devolutionProcesses, setDevolutionProcesses] = useState<DevolutionProcess[]>([]);

  // State for Add Asset form
  const [assetSerial, setAssetSerial] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStock, setAssetStock] = useState('');
  const [assetType, setAssetType] = useState<AssetType | ''| undefined>('');
  
  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/');
    }
  }, [userData, loading, router]);

  const fetchAllData = useCallback(async () => {
    try {
        const [assignRequests, devProcesses] = await Promise.all([
            getAssignmentRequests(),
            getDevolutionProcesses(),
        ]);
        setAssignmentRequests(assignRequests);
        setDevolutionProcesses(devProcesses);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    }
  }, [toast]);

  useEffect(() => {
    if (userData) {
        fetchAllData();
    }
  }, [userData, fetchAllData]);

  
  const handleAddAsset = async (event: FormEvent<HTMLFormElement>) => {
    // ... (implementation remains the same)
  };

  const handleProcessRequest = async (id: string) => {
    // ... (implementation remains the same)
  };

  const handleVerifyReturn = async (processId: string, assetId: string) => {
    try {
        await verifyAssetReturn(processId, assetId);
        toast({ title: "Activo Verificado", description: "El activo ha sido marcado como devuelto y puesto en stock." });
        await fetchAllData();
    } catch (error: any) {
        console.error("Error verificando activo:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo verificar el activo." });
    }
  };

  const handleCompleteProcess = async (processId: string) => {
    try {
        await completeDevolutionProcess(processId);
        toast({ title: "Proceso Completado", description: "El proceso de devolución ha sido finalizado." });
        await fetchAllData();
    } catch (error: any) {
        console.error("Error completando proceso:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar el proceso." });
    }
  };

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Panel de Logística</h1>
      </div>
      <div className="grid gap-6 mt-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Procesos de Devolución en Curso</CardTitle>
            <CardDescription>Verifique la devolución física de los activos de los empleados que terminan su contrato.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {devolutionProcesses.map(process => (
                <AccordionItem value={process.id} key={process.id}>
                  <AccordionTrigger>{process.employeeName} - {process.assets.filter(a => !a.verified).length} activos pendientes</AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activo</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {process.assets.map(asset => (
                          <TableRow key={asset.id}>
                            <TableCell>{asset.name}</TableCell>
                            <TableCell>{asset.serial}</TableCell>
                            <TableCell>
                              <Badge variant={asset.verified ? 'success' : 'outline'}>{asset.verified ? 'Verificado' : 'Pendiente'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {!asset.verified && (
                                <Button size="sm" onClick={() => handleVerifyReturn(process.id, asset.id)}>
                                  <CheckCheck className="h-4 w-4 mr-2" /> Verificar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {process.assets.every(a => a.verified) && (
                        <div className="text-right mt-4">
                            <Button variant="secondary" onClick={() => handleCompleteProcess(process.id)}>Completar Proceso</Button>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">{/* ... Add Asset Card ... */}</Card>
        <Card className="lg:col-span-2">{/* ... Assignment Requests Card ... */}</Card>
      </div>
    </>
  );
}