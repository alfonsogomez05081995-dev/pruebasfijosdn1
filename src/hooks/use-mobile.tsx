// Importa React para poder usar los hooks de React.
import * as React from "react"

// Define el punto de ruptura para la vista móvil.
const MOBILE_BREAKPOINT = 768

/**
 * Hook personalizado para detectar si el dispositivo es móvil.
 * @returns `true` si el ancho de la ventana es menor que el punto de ruptura móvil, de lo contrario `false`.
 */
export function useIsMobile() {
  // Estado para almacenar si el dispositivo es móvil o no.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  // Efecto para añadir y eliminar el listener del evento de cambio de tamaño de la ventana.
  React.useEffect(() => {
    // Crea una media query para detectar el ancho de la ventana.
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    // Función que se ejecuta cuando cambia el tamaño de la ventana.
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    // Añade el listener para el evento de cambio de tamaño.
    mql.addEventListener("change", onChange)
    // Establece el estado inicial.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    // Devuelve una función de limpieza para eliminar el listener cuando el componente se desmonta.
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Devuelve el estado actual, convertido a booleano.
  return !!isMobile
}
