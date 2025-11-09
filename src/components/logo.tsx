// Importa el tipo SVGProps de React para tipar las propiedades del componente.
import type { SVGProps } from "react";

// Define el componente funcional Logo, que renderiza el logotipo de la aplicación.
// Acepta propiedades SVG estándar para permitir su personalización.
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    // Contenedor SVG principal con atributos de tamaño y vista.
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="64"
      height="64"
      {...props}
    >
      {/* Definiciones de gradientes y otros elementos reutilizables. */}
      <defs>
        {/* Gradiente lineal para el fondo del logotipo. */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))" }} />
        </linearGradient>
      </defs>
      {/* Rectángulo principal que forma el cuerpo del logotipo con esquinas redondeadas y el gradiente como relleno. */}
      <rect width="100" height="100" rx="20" fill="url(#logoGradient)" />
      {/* Texto "FDN" en el centro del logotipo. */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="40"
        fontWeight="bold"
        fill="hsl(var(--primary-foreground))"
        fontFamily="var(--font-family-headline)"
      >
        FDN
      </text>
    </svg>
  );
}
