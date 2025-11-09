import * as React from "react"

// Define el punto de quiebre para considerar una pantalla como "móvil".
// Cualquier ancho de pantalla por debajo de 768px será considerado móvil.
const MOBILE_BREAKPOINT = 768

/**
 * Hook personalizado `useIsMobile`.
 * Determina si el ancho de la ventana del navegador corresponde a un dispositivo móvil.
 * Es útil para renderizar componentes de manera condicional o aplicar estilos específicos
 * para la versión móvil de la aplicación.
 *
 * @returns {boolean} - Devuelve `true` si el ancho de la pantalla es menor que el `MOBILE_BREAKPOINT`, `false` en caso contrario.
 */
export function useIsMobile() {
  // Estado para almacenar si la pantalla es móvil o no.
  // Se inicializa como `undefined` para manejar el renderizado inicial en el servidor (SSR),
  // donde el objeto `window` no está disponible.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  // `useEffect` se ejecuta solo en el lado del cliente, donde `window` está disponible.
  React.useEffect(() => {
    // `window.matchMedia` crea un objeto que verifica si el documento cumple con una media query.
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Función que se ejecuta cuando cambia el tamaño de la ventana.
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Añade un oyente de eventos que se dispara cuando el resultado de la media query cambia.
    mql.addEventListener("change", onChange)

    // Establece el estado inicial al cargar el componente en el cliente.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Función de limpieza: se ejecuta cuando el componente se desmonta.
    // Elimina el oyente de eventos para prevenir fugas de memoria.
    return () => mql.removeEventListener("change", onChange)
  }, []) // El array vacío asegura que el efecto se ejecute solo una vez (al montar el componente).

  // Devuelve `true` o `false`. El doble signo de negación (!!) convierte el valor
  // (que podría ser `undefined` en el primer render del servidor) a un booleano.
  return !!isMobile
}
