"use client"

// Inspirado en la biblioteca react-hot-toast.
// Este archivo implementa un sistema personalizado para gestionar notificaciones (toasts).
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// --- Constantes de Configuración ---
const TOAST_LIMIT = 1 // Límite de toasts visibles a la vez.
const TOAST_REMOVE_DELAY = 1000000 // Tiempo de espera antes de eliminar un toast del DOM.

// --- Tipos de Datos ---
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// --- Acciones del Reducer ---
// Define los tipos de acciones que se pueden despachar para modificar el estado de los toasts.
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",       // Añadir un nuevo toast.
  UPDATE_TOAST: "UPDATE_TOAST",   // Actualizar un toast existente.
  DISMISS_TOAST: "DISMISS_TOAST", // Ocultar un toast (inicia el proceso de eliminación).
  REMOVE_TOAST: "REMOVE_TOAST",   // Eliminar un toast del estado.
} as const

// --- Generador de IDs ---
let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

// Define la estructura de cada acción.
type Action =
  | { type: ActionType["ADD_TOAST"], toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"], toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"], toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"], toastId?: ToasterToast["id"] }

// Define la estructura del estado global de los toasts.
interface State {
  toasts: ToasterToast[]
}

// --- Lógica de Eliminación y Timeouts ---
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// --- Reducer ---
/**
 * El reducer es una función pura que toma el estado actual y una acción,
 * y devuelve un nuevo estado. Es el núcleo de la lógica de estado.
 * @param state - El estado actual.
 * @param action - La acción a procesar.
 * @returns El nuevo estado.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Añade un nuevo toast al principio del array y respeta el límite.
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // Actualiza un toast específico en el array.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      // Efecto secundario: añade el toast a la cola de eliminación.
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      // Cambia la propiedad 'open' a 'false' para que el componente de UI se cierre.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      // Elimina un toast del array de estado.
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// --- Patrón de Oyente (Listener Pattern) ---
// Se utiliza para notificar a los componentes (a través del hook useToast) cuando el estado cambia.
const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] } // El estado se mantiene en memoria fuera de React.

/**
 * Despacha una acción al reducer y notifica a todos los oyentes del nuevo estado.
 * @param action - La acción a despachar.
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

/**
 * Función `toast`.
 * Es la función que se llama desde los componentes para mostrar una nueva notificación.
 * @param props - Las propiedades del toast (título, descripción, variante, etc.).
 * @returns Un objeto con el ID del toast y funciones para actualizarlo o descartarlo.
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  // Despacha la acción para añadir el nuevo toast al estado.
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return { id: id, dismiss, update }
}

/**
 * Hook `useToast`.
 * Permite a los componentes de React suscribirse a los cambios de estado de los toasts
 * y obtener las funciones para mostrar o descartar notificaciones.
 * @returns Un objeto con el estado actual de los toasts y las funciones `toast` y `dismiss`.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  // Se suscribe al array de oyentes cuando el componente se monta.
  React.useEffect(() => {
    listeners.push(setState)
    // Se desuscribe cuando el componente se desmonta para evitar fugas de memoria.
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
