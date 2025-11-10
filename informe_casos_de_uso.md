# Informe de Casos de Uso: Sistema de Gestión de Activos Fijos (FijosDN)

**Nombre del Autor:** [Tu Nombre]
**Afiliación Institucional:** [Tu Institución]
**Curso:** [Tu Curso]
**Nombre del Instructor:** [Nombre del Instructor]
**Fecha:** [Fecha Actual]

---

## Introducción

El sistema "FijosDN" es una aplicación web diseñada para la gestión integral del ciclo de vida de los activos fijos dentro de una organización. La plataforma permite un control detallado desde la adquisición y asignación de activos hasta su eventual reemplazo o disposición final. A través de un sistema de control de acceso basado en roles, la aplicación garantiza que cada usuario tenga las herramientas necesarias para cumplir con sus responsabilidades de manera eficiente y segura. Este documento detalla los casos de uso específicos para cada rol definido en el sistema: Empleado, Logística y Master.

---

## Casos de Uso por Rol

A continuación, se describen las funcionalidades clave y los flujos de trabajo para cada uno de los roles principales del sistema.

### 1. Rol de Empleado

El rol de Empleado está diseñado para los usuarios finales que reciben y utilizan los activos de la compañía.

#### 1.1. Gestión de Activos Asignados

- **Descripción:** Los empleados pueden visualizar los activos que tienen bajo su custodia, así como confirmar o rechazar la recepción de nuevos activos.
- **Lógica de Servicio:**
    - `getMyAssignedAssets(employeeId)` en `src/lib/services.ts`: **Obtiene y muestra** todos los activos que están registrados a nombre del empleado que ha iniciado sesión.
    - `confirmAssetReceipt(assetId, actor)` en `src/lib/services.ts`: Se ejecuta cuando el empleado confirma que ha recibido un activo. **Actualiza el estado del activo** de "recibido pendiente" a "activo".
    - `rejectAssetReceipt(assetId, reason, actor)` en `src/lib/services.ts`: Se utiliza cuando un empleado rechaza un activo. **Cambia el estado del activo a "en disputa"** y registra el motivo del rechazo, notificando a logística.

#### 1.2. Solicitud de Reemplazo de Activos

- **Descripción:** Permite a los empleados solicitar el reemplazo de un activo debido a daño, desgaste, pérdida o robo. El proceso requiere una justificación detallada y evidencia fotográfica.
- **Lógica de Servicio:**
    - `submitReplacementRequest(requestData)` en `src/lib/services.ts`: **Crea una nueva solicitud de reemplazo** en la base de datos, adjuntando la justificación y la imagen proporcionada. Además, cambia el estado del activo a "reemplazo solicitado".
    - `getPendingReplacementRequestsForEmployee(employeeId)` en `src/lib/services.ts`: **Consulta y muestra** al empleado el estado de las solicitudes de reemplazo que ha enviado y que aún están pendientes de aprobación.

#### 1.3. Devolución de Activos

- **Descripción:** Al finalizar su relación laboral, el empleado puede iniciar el proceso de devolución de todos sus activos. Esta acción es un prerrequisito para obtener el paz y salvo.
- **Lógica de Servicio:**
    - `initiateDevolutionProcess(employeeId, employeeName)` en `src/lib/services.ts`: **Inicia el proceso de devolución**, cambiando el estado de todos los activos del empleado a "en devolución" y creando un registro para que logística gestione la recepción física.

---

### 2. Rol de Logística

El rol de Logística es responsable de la gestión física del inventario, así como del despacho y recepción de activos.

#### 2.1. Gestión de Inventario

- **Descripción:** El personal de logística puede ingresar nuevos activos al sistema, ya sea de forma manual o mediante una carga masiva, y consultar el inventario completo.
- **Lógica de Servicio:**
    - `addAsset(assetData)` en `src/lib/services.ts`: **Añade un único activo** nuevo al inventario.
    - `addAssetsInBatch(assets)` en `src/lib/services.ts`: **Procesa un archivo (Excel o texto) para agregar múltiples activos** al inventario de una sola vez.
    - `getStockAssets(userRole)` en `src/lib/services.ts`: **Consulta y devuelve una lista de todos los activos** que se encuentran actualmente "en stock" y disponibles para ser asignados.

#### 2.2. Gestión de Asignaciones y Envíos

- **Descripción:** Procesa las solicitudes de asignación generadas por los roles Master, registrando la transportadora y el número de guía. También gestiona los envíos que han sido rechazados por los empleados.
- **Lógica de Servicio:**
    - `getAssignmentRequestsForLogistics()` en `src/lib/services.ts`: **Obtiene la lista de solicitudes de asignación** que están pendientes de ser procesadas o que han sido rechazadas por los empleados.
    - `processAssignmentRequest(...)` en `src/lib/services.ts`: **Gestiona el envío de un activo**. Reduce el stock, crea un nuevo registro de activo para el empleado y actualiza la solicitud a "enviado" con los datos de la transportadora.
    - `retryAssignment(...)` en `src/lib/services.ts`: Se utiliza para **volver a intentar el envío de un activo** que fue previamente rechazado por un empleado.
    - `archiveAssignment(requestId, reason)` en `src/lib/services.ts`: **Archiva y cancela una solicitud** que no puede ser completada, revirtiendo el stock si es necesario.

#### 2.3. Gestión de Devoluciones

- **Descripción:** Supervisa y verifica la recepción física de los activos devueltos por los empleados. Puede retornar un activo al stock o darlo de baja si está inutilizable.
- **Lógica de Servicio:**
    - `getDevolutionProcesses()` en `src/lib/services.ts`: **Obtiene la lista de todos los procesos de devolución** que han sido iniciados por los empleados y que requieren acción por parte de logística.
    - `verifyAssetReturn(processId, assetId)` en `src/lib/services.ts`: **Marca un activo como verificado** y lo retorna al inventario con estado "en stock".
    - `decommissionAsset(...)` en `src/lib/services.ts`: **Da de baja un activo**, cambiando su estado a "baja" y registrando la justificación y evidencia fotográfica.
    - `completeDevolutionProcess(processId)` en `src/lib/services.ts`: **Cierra el proceso de devolución** una vez que todos los activos del empleado han sido verificados o dados de baja.

---

### 3. Rol de Master

Los roles Master (incluyendo Master IT, Campo y Depot) tienen responsabilidades de supervisión, aprobación y gestión de usuarios.

#### 3.1. Gestión de Usuarios

- **Descripción:** Los usuarios Master pueden invitar a nuevos empleados al sistema, así como editar la información y el rol de los usuarios existentes, o eliminarlos si es necesario.
- **Lógica de Servicio:**
    - `inviteUser(email, role, inviterId)` en `src/lib/services.ts`: **Crea un documento de invitación** para un nuevo usuario, permitiéndole registrarse en el sistema.
    - `getUsers(roleFilter, inviterId)` en `src/lib/services.ts`: **Obtiene una lista de todos los usuarios** del sistema, con la opción de filtrar por rol.
    - `updateUser(userId, updates)` en `src/lib/services.ts`: **Actualiza los datos** (como el nombre o el rol) de un usuario existente.
    - `deleteUser(userId)` en `src/lib/services.ts`: **Elimina un usuario** de la base de datos.

#### 3.2. Creación de Asignaciones de Activos

- **Descripción:** Crean solicitudes formales para asignar activos a los empleados, justificando la necesidad y el tipo de asignación.
- **Lógica de Servicio:**
    - `sendBulkAssignmentRequests(requests)` en `src/lib/services.ts`: **Crea múltiples solicitudes de asignación** de una sola vez para un empleado.
    - `getAssignmentRequestsForMaster(masterId)` en `src/lib/services.ts`: **Muestra el historial de todas las solicitudes** de asignación que el master ha creado.

#### 3.3. Aprobación de Solicitudes de Reemplazo

- **Descripción:** Actúan como el punto de aprobación para las solicitudes de reemplazo iniciadas por los empleados. Su aprobación desencadena el proceso de envío por parte de logística.
- **Lógica de Servicio:**
    - `getReplacementRequestsForMaster(masterId)` en `src/lib/services.ts`: **Obtiene todas las solicitudes de reemplazo pendientes de aprobación** para que el master pueda revisarlas.
    - `approveReplacementRequest(requestId, actor)` en `src/lib/services.ts`: **Aprueba una solicitud**. Cambia el estado de la solicitud, actualiza el activo dañado y crea una nueva solicitud de asignación para logística.
    - `rejectReplacementRequest(requestId, reason, actor)` en `src/lib/services.ts`: **Rechaza una solicitud**. Cambia el estado de la solicitud a "rechazado", registra el motivo y revierte el estado del activo original a "activo".

---

## Conclusión

El sistema FijosDN implementa un flujo de trabajo robusto y bien definido para la administración de activos fijos. La separación de responsabilidades a través de roles específicos (Empleado, Logística y Master) permite un control granular y seguro sobre cada etapa del ciclo de vida de un activo. La arquitectura del código, centrada en páginas de Next.js para la interfaz y un archivo de servicios (`services.ts`) para la lógica de negocio, facilita el mantenimiento y la escalabilidad del sistema.