// Indica que este componente se ejecuta en el lado del cliente.
"use client"

// Importa React y los componentes primitivos de Accordion de Radix UI.
import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
// Importa el icono ChevronDown de lucide-react.
import { ChevronDown } from "lucide-react"

// Importa la utilidad cn para combinar clases de CSS.
import { cn } from "@/lib/utils"

// Define el componente Accordion como el componente raíz de AccordionPrimitive.
const Accordion = AccordionPrimitive.Root

// Define el componente AccordionItem, que es un contenedor para cada elemento del acordeón.
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    // Combina las clases CSS proporcionadas con las clases predeterminadas.
    className={cn("border-b", className)}
    {...props}
  />
))
// Asigna un nombre para mostrar al componente para facilitar la depuración.
AccordionItem.displayName = "AccordionItem"

// Define el componente AccordionTrigger, que es el botón que abre y cierra un elemento del acordeón.
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      // Combina las clases CSS proporcionadas con las clases predeterminadas.
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {/* Renderiza el contenido del botón. */}
      {children}
      {/* Renderiza el icono de flecha hacia abajo. */}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
// Asigna un nombre para mostrar al componente para facilitar la depuración.
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

// Define el componente AccordionContent, que es el contenido que se muestra cuando se abre un elemento del acordeón.
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    // Define las clases CSS para las animaciones de apertura y cierre.
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    {/* Renderiza el contenido del acordeón. */}
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

// Asigna un nombre para mostrar al componente para facilitar la depuración.
AccordionContent.displayName = AccordionPrimitive.Content.displayName

// Exporta los componentes para que puedan ser utilizados en otras partes de la aplicación.
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
