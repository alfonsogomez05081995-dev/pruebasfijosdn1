import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="64"
      height="64"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))" }} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#logoGradient)" />
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
