'use client';

// Importación de hooks y componentes necesarios de React y Next.js
import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Importación de contextos y servicios personalizados
import { useAuth } from '@/contexts/AuthContext';
import { getStockAssets, updateAsset, deleteAsset } from '@/lib/services';
import { Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
// Importación de componentes de la interfaz de usuario (UI) de Shadcn
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Importación de la librería para manejar archivos Excel
import * as XLSX from 'xlsx';

/**
 * Función auxiliar para formatear el tipo de activo para una mejor visualización en la UI.
 * @param {string} type - El tipo de activo desde la base de datos (ej. 'equipo_de_computo').
 * @returns {string} El tipo de activo formateado (ej. 'Equipo De Computo').
 */
const formatAssetType = (type: string) => {
  if (!type) return 'N/A';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Componente StockPage.
 * Muestra el inventario general de activos y permite realizar operaciones CRUD sobre ellos,
 * basándose en el rol del usuario.
 */
export default function StockPage() {
  // --- Hooks y Estados ---
  const { userData, loading } = useAuth(); // Hook para obtener datos del usuario y estado de carga.
  const router = useRouter();
  const { toast } = useToast(); // Hook para mostrar notificaciones.
  
  // Estado para almacenar la lista de activos del inventario.
  const [inventory, setInventory] = useState<Asset[]>([]);
  
  // Estados para controlar la visibilidad de los modales (diálogos) de edición y eliminación.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Estado para almacenar el activo que ha sido seleccionado para una operación.
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  // Estado para manejar los datos del formulario en el modal de edición.
  const [editFormData, setEditFormData] = useState<Partial<Asset>>({});

  /**
   * Obtiene el inventario desde el backend.
   * Se usa `useCallback` para memorizar la función y evitar recrearla en cada render,
   * optimizando el rendimiento.
   */
  const fetchInventory = useCallback(async () => {
    if (!userData) return; // No hace nada si los datos del usuario aún no están disponibles.
    try {
      // Llama al servicio `getStockAssets`, que ya filtra los activos según el rol del usuario.
      const assets = await getStockAssets(userData.role);
      setInventory(assets);
    } catch (error) {
      console.error("Error al obtener el inventario:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el inventario.' });
    }
  }, [userData, toast]); // Dependencias: se recrea si `userData` o `toast` cambian.

  // Efecto para cargar el inventario inicial cuando el componente se monta y los datos del usuario están listos.
  useEffect(() => {
    if (userData) {
      fetchInventory();
    }
  }, [userData, fetchInventory]);

  /**
   * Manejador para la descarga del inventario en formato Excel.
   */
  const handleDownloadExcel = () => {
    // Mapea los datos del inventario a un formato más legible para el archivo Excel.
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

    // Usa la librería XLSX para crear y descargar el archivo.
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'InventarioGeneral.xlsx');
  };

  // --- Manejadores de Operaciones CRUD ---

  /**
   * Abre el modal de edición y carga los datos del activo seleccionado en el formulario.
   * @param {Asset} asset - El activo a editar.
   */
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

  /**
   * Maneja el envío del formulario de actualización de un activo.
   * @param {FormEvent} e - El evento del formulario.
   */
  const handleUpdateAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    try {
      const updatedData = { ...editFormData };
      // Asegura que el stock sea un número antes de enviarlo.
      if (typeof updatedData.stock === 'string') {
        updatedData.stock = parseInt(updatedData.stock, 10) || 0;
      }

      await updateAsset(selectedAsset.id, updatedData);
      toast({ title: 'Éxito', description: 'Activo actualizado correctamente.' });
      setIsEditModalOpen(false);
      fetchInventory(); // Refresca la lista de inventario para mostrar los cambios.
    } catch (error: any) {
      console.error("Error al actualizar el activo:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo actualizar el activo.' });
    }
  };

  /**
   * Abre el modal de confirmación para eliminar un activo.
   * @param {Asset} asset - El activo a eliminar.
   */
  const handleOpenDeleteModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  /**
   * Maneja la eliminación de un activo tras la confirmación.
   */
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    try {
      await deleteAsset(selectedAsset.id);
      toast({ title: 'Éxito', description: 'Activo eliminado correctamente.' });
      setIsDeleteModalOpen(false);
      fetchInventory(); // Refresca la lista.
    } catch (error: any) {
      console.error("Error al eliminar el activo:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo eliminar el activo.' });
    }
  };
  
  /**
   * Maneja los cambios en los campos del formulario de edición.
   * @param {React.ChangeEvent<HTMLInputElement>} e - El evento de cambio del input.
   */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- Renderizado Condicional ---

  // Muestra un mensaje de carga mientras se obtienen los datos del usuario.
  if (loading || !userData) {
    return <div>Cargando...</div>;
  }

  // Control de acceso basado en rol: solo los roles 'master' y 'logistica' pueden ver esta página.
  if (!userData.role.startsWith('master') && userData.role !== 'logistica') {
    return <div>Acceso no autorizado.</div>;
  }

  // --- Renderizado del Componente ---
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
                <TableHead>Referencia</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Asignado a</TableHead>
                {/* Renderizado condicional de la columna de acciones solo para el rol 'master'. */}
                {userData.role === 'master' && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? (
                inventory.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.reference || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{formatAssetType(asset.tipo)}</TableCell>
                    <TableCell>{asset.serial || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{asset.status}</Badge></TableCell>
                    <TableCell>{asset.stock || 0}</TableCell>
                    <TableCell>{asset.location || 'N/A'}</TableCell>
                    <TableCell>{asset.employeeName || 'N/A'}</TableCell>
                    {/* Renderizado condicional de los botones de acción. */}
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
                  <TableCell colSpan={userData.role === 'master' ? 9 : 8} className="text-center">No hay activos en el inventario.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Activo</DialogTitle>
            <DialogDescription>Modifique los detalles del activo. Haga clic en guardar para aplicar los cambios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAsset} className="grid gap-4 py-4">
            {/* Campos del formulario de edición */}
            <div className="grid gap-2">
              <Label htmlFor="reference">Referencia</Label>
              <Input id="reference" value={editFormData.reference || ''} onChange={handleFormChange} />
            </div>
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
            {/* TODO: Añadir campos de selección para 'tipo' y 'status' para una mejor UX. */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
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