'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInventory, Asset, updateAsset, deleteAsset } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

// Helper to format asset type for display
const formatAssetType = (type: string) => {
  if (!type) return 'N/A'; // Defensive check for undefined type
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function StockPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<Asset[]>([]);
  
  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Asset>>({});

  useEffect(() => {
    if (!loading && (!userData || !['master', 'logistica'].includes(userData.role))) {
      router.push('/dashboard'); // Redirect to a safe page if not authorized
    }
  }, [userData, loading, router]);

  const fetchInventory = useCallback(async () => {
    try {
      const assets = await getInventory();
      setInventory(assets);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el inventario.' });
    }
  }, [toast]);

  useEffect(() => {
    if (userData) {
      fetchInventory();
    }
  }, [userData, fetchInventory]);

  const handleDownloadExcel = () => {
    const dataToExport = inventory.map(asset => ({
      'Referencia': asset.reference || 'N/A',
      'Descripción': asset.name,
      'Serial': asset.serial || 'N/A',
      'Tipo de Activo': formatAssetType(asset.tipo),
      'Estado': asset.status,
      'Stock': asset.stock || 0,
      'Ubicación': asset.location || 'N/A',
      'Asignado a': asset.employeeName || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'InventarioGeneral.xlsx');
  };

  // --- CRUD Handlers ---
  const handleOpenEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditFormData({
      name: asset.name,
      reference: asset.reference,
      serial: asset.serial,
      location: asset.location,
      stock: asset.stock,
      tipo: asset.tipo,
      status: asset.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    try {
      const updatedData = { ...editFormData };
      // Ensure stock is a number
      if (typeof updatedData.stock === 'string') {
        updatedData.stock = parseInt(updatedData.stock, 10) || 0;
      }

      await updateAsset(selectedAsset.id, updatedData);
      toast({ title: 'Éxito', description: 'Activo actualizado correctamente.' });
      setIsEditModalOpen(false);
      fetchInventory(); // Refresh inventory
    } catch (error: any) {
      console.error("Error updating asset:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo actualizar el activo.' });
    }
  };

  const handleOpenDeleteModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    try {
      await deleteAsset(selectedAsset.id);
      toast({ title: 'Éxito', description: 'Activo eliminado correctamente.' });
      setIsDeleteModalOpen(false);
      fetchInventory(); // Refresh inventory
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el activo.' });
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  if (!['master', 'logistica'].includes(userData.role)) {
    return <div>Acceso no autorizado.</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventario General</CardTitle>
            <CardDescription>Una vista completa de todos los activos en el sistema.</CardDescription>
          </div>
          <Button onClick={handleDownloadExcel} disabled={inventory.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Asignado a</TableHead>
                {userData.role === 'master' && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? (
                inventory.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{formatAssetType(asset.tipo)}</TableCell>
                    <TableCell>{asset.serial || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{asset.status}</Badge></TableCell>
                    <TableCell>{asset.stock || 0}</TableCell>
                    <TableCell>{asset.location || 'N/A'}</TableCell>
                    <TableCell>{asset.employeeName || 'N/A'}</TableCell>
                    {userData.role === 'master' && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(asset)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={userData.role === 'master' ? 8 : 7} className="text-center">No hay activos en el inventario.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Activo</DialogTitle>
            <DialogDescription>Modifique los detalles del activo. Haga clic en guardar para aplicar los cambios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAsset} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Descripción</Label>
              <Input id="name" value={editFormData.name || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serial">Serial</Label>
              <Input id="serial" value={editFormData.serial || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" value={editFormData.location || ''} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" value={editFormData.stock || 0} onChange={handleFormChange} />
            </div>
            {/* TODO: Add Select inputs for 'tipo' and 'status' if they should be editable */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Está seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El activo "{selectedAsset?.name}" será eliminado permanentemente de la base de datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAsset}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}