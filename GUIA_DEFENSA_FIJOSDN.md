# 🎓 GUÍA MAESTRA DE DEFENSA: PROYECTO FIJOSDN

**Autor:** [Luis Alfonso Gomez Martinez]  
**Proyecto:** FijosDN (Sistema de Gestión y Trazabilidad de Activos Fijos)  
**Tecnologías:** Next.js 16, React 19, Firebase (Firestore, Auth), Tailwind CSS.  
**Metodología:** SCRUM.

---

## 1. INTRODUCCIÓN Y VISIÓN GENERAL

**FijosDN** es una solución web diseñada para resolver la pérdida de trazabilidad en la gestión de activos fijos. A diferencia de un simple inventario en Excel, este sistema gestiona el **ciclo de vida completo** del activo: desde su compra e ingreso, pasando por la asignación a empleados, hasta su devolución y generación automática de paz y salvos legales.

---

## 2. MAPA DE NAVEGACIÓN (ESTRUCTURA DE CARPETAS)

Cuando el jurado pregunte: *"¿Cómo organizaste tu proyecto?"*, esta es la respuesta.

### 🔴 Carpetas del Sistema (Automáticas - No se tocan)
*   **`/.next`**: La carpeta de **Compilación**. Contiene la versión optimizada del código. Se regenera con `npm run build`.
*   **`/node_modules`**: La **Biblioteca**. Contiene el código de terceros (React, Firebase, Zod) descargado por `npm install`.
*   **`/.firebase`**: Archivos temporales de caché para el hosting.

### 🟢 Carpetas de Ingeniería (Tu Código - `src/`)
Aquí reside la lógica del negocio.

#### 📂 `src/lib/` (El Núcleo Lógico)
Separa la lógica de la interfaz (UI).
*   **`types.ts`**: **Contratos de Datos**. Define interfaces estrictas (ej. `Asset`) y tipos de unión (`AssetType`) para evitar datos inválidos.
*   **`services.ts`**: **Capa de Servicios**. Centraliza TODAS las comunicaciones con Firestore. Aquí viven las transacciones.
*   **`pdfGenerator.ts`**: **Motor de Documentos**. Lógica específica para generar el PDF de "Paz y Salvo".
*   **`firebase.ts`**: **Conexión**. Inicializa la instancia única de Firebase.

#### 📂 `src/app/` (Enrutamiento y Vistas)
*   **`layout.tsx` (Raíz)**: Marco principal y autenticación global.
*   **`dashboard/`**: Área privada protegida por roles.
    *   **`master/`**: Rutas exclusivas del Administrador.
    *   **`logistica/`**: Rutas de almacén.
    *   **`empleado/`**: Portal del usuario final.

---

## 3. ANÁLISIS DE CASOS DE USO (LÓGICA DEL CÓDIGO)

Aquí explicamos el **flujo lógico paso a paso** de las funciones principales.

### 🔄 Caso de Uso 1: Gestión de Stock e Inventario
**Actor:** Logística.
**Objetivo:** Ingresar nuevos activos al sistema garantizando la integridad de los datos.

1.  **Entrada (Frontend):**
    *   Archivo: `src/app/dashboard/logistica/page.tsx`
    *   Formulario valida campos obligatorios. Si es carga masiva, `handleBulkUpload` normaliza el Excel (quita tildes, mayúsculas).
2.  **Procesamiento (Backend/Servicio):**
    *   Archivo: `src/lib/services.ts` -> Función `upsertAsset`.
    *   **Lógica de Validación:**
        ```typescript
        if (isSerializable) {
            if (!assetData.serial) throw Error("Serial obligatorio");
            if (assetData.stock !== 1) throw Error("Stock debe ser 1");
        }
        ```
    *   **Transacción:** Si el activo ya existe (por referencia), suma el stock. Si no, crea el documento.
3.  **Salida:** Actualización en tiempo real en la colección `assets` de Firestore.

### 🔄 Caso de Uso 2: Asignación de Activo (Flujo Complejo)
**Actores:** Master (Solicita) -> Logística (Despacha) -> Empleado (Recibe).
**Objetivo:** Trazabilidad completa de quién tiene qué equipo.

1.  **Fase 1: Solicitud (Master)**
    *   El Master crea una `AssignmentRequest`. Estado inicial: `'pendiente de envío'`.
2.  **Fase 2: Despacho (Logística)**
    *   Archivo: `src/lib/services.ts` -> Función `processAssignmentRequest`.
    *   **Lógica Crítica (Transacción Atómica):**
        *   Se busca el activo en stock por Serial exacto.
        *   **EN LA MISMA OPERACIÓN:**
            1.  Se actualiza el activo a estado `'recibido pendiente'`.
            2.  Se vincula el `employeeId` al activo.
            3.  Se actualiza la solicitud a estado `'enviado'` con número de guía.
3.  **Fase 3: Recepción (Empleado)**
    *   El empleado confirma en su dashboard. Esto dispara `confirmAssetReceipt`, cambiando el estado final a `'activo'`.

### 🔄 Caso de Uso 3: Devolución y Paz y Salvo
**Actor:** Empleado -> Logística.
**Objetivo:** Certificar legalmente la devolución de equipos.

1.  **Entrada:** Empleado solicita devolución. Logística verifica físicamente los equipos.
2.  **Procesamiento (Cierre):**
    *   Archivo: `src/lib/services.ts` -> Función `completeDevolutionProcess`.
    *   Verifica que TODOS los activos de la lista tengan `verified: true`.
3.  **Generación del Documento (Salida):**
    *   Archivo: `src/lib/pdfGenerator.ts` -> Función `generatePazYSalvoPDF`.
    *   Toma el objeto de devolución, consulta la fecha actual y genera un PDF binario en el navegador del cliente (Client-Side Generation), ahorrando recursos del servidor.

---

## 4. CUMPLIMIENTO DE HISTORIAS DE USUARIO (REQUERIMIENTOS)

*   **HI-001 (Gestión Usuarios):** Cumplido en `src/app/dashboard/master` y funciones de `inviteUser`.
*   **HI-002 (Ingreso Equipos):** Cumplido con validación de seriales en `upsertAsset`.
*   **HI-003 (Alistamiento):** Cumplido con el sistema de estados (`pendiente` -> `enviado`) en `processAssignmentRequest`.
*   **HI-004 (Confirmación/Paz y Salvo):** Cumplido con `generatePazYSalvoPDF`.
*   **HI-006 (Roles):** Cumplido en `src/app/dashboard/layout.tsx` protegiendo las rutas.

---

## 5. CUMPLIMIENTO DE REQUISITOS NO FUNCIONALES

*   **Disponibilidad 24/7 (HI-005):** Garantizada por la infraestructura Serverless de **Firebase**.
*   **Multiresolución:** Lograda con el diseño responsivo de **Tailwind CSS**.
*   **Seguridad y Hábeas Data (HI-008):** Implementada mediante Reglas de Seguridad de Firestore (bloqueo de lecturas no autorizadas).

---

## 6. PREGUNTAS TÉCNICAS FRECUENTES

**P: ¿Qué pasa si falla el internet durante una asignación?**
> **R:** "Firebase tiene persistencia offline. Además, al usar transacciones (`runTransaction`), si la operación se corta a la mitad, la base de datos revierte los cambios (Rollback automático) para evitar inconsistencias."

**P: ¿Por qué usaste `jspdf` en lugar de generar el PDF en el servidor?**
> **R:** "Para reducir la carga y costos del servidor. Al generarlo en el cliente (navegador), aprovecho la potencia del dispositivo del usuario y entrego el documento instantáneamente."

---

## 7. NIVEL INGENIERÍA (PREGUNTAS DE GRADO/TESIS)

Esta sección justifica tus decisiones técnicas de alto nivel.

### 🗄️ Modelo de Datos (Desnormalización en NoSQL)
**Pregunta:** *"¿Por qué guarda el nombre del empleado dentro del documento del Activo? ¿No es redundancia?"*
**Tu Defensa:**
"En bases de datos relacionales (SQL) sería un error de normalización. Pero en **Firestore (NoSQL)**, apliqué una estrategia de **Desnormalización para Lectura**. Al guardar `employeeName` junto con el activo, evito tener que hacer una segunda consulta a la colección de `users` cada vez que listo el inventario. Esto reduce los costos de lectura en Firebase y hace que el Dashboard cargue instantáneamente."

### 🚀 Estrategia de Despliegue (Deployment)
**Pregunta:** *"¿Cómo está montado esto en internet?"*
**Tu Defensa:**
"La aplicación sigue una arquitectura moderna. El Frontend (Next.js) se despliega en servicios optimizados como **Vercel** (o Firebase Hosting), mientras que el Backend es completamente gestionado por Google Cloud (Firebase). Esto elimina la necesidad de mantener servidores Linux manuales, reduciendo la deuda técnica operativa."

### 🧪 Aseguramiento de Calidad (QA)
**Pregunta:** *"¿Cómo probaste el software?"*
**Tu Defensa:**
"Realicé **Pruebas Funcionales Exhaustivas** mapeadas a los Criterios de Aceptación de cada Historia de Usuario.
1.  Validé 'Happy Paths' (flujos ideales).
2.  Validé 'Edge Cases' (ej. intentar asignar un activo con stock 0 o subir un Excel con columnas incorrectas), asegurando que las validaciones de Zod y los `try/catch` del servicio manejaran el error correctamente sin romper la aplicación."

### 💡 Lección Aprendida (El Desafío)
**Pregunta:** *"¿Qué fue lo más difícil del desarrollo?"*
**Tu Defensa:**
"El manejo de la asincronía en la generación del Paz y Salvo. Tuve que coordinar la verificación de estado de múltiples activos en la base de datos con la renderización gráfica del PDF en el cliente. Lo resolví implementando promesas paralelas (`Promise.all`) para asegurar que la data estuviera lista antes de dibujar el documento."
