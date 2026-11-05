// Icones inline em SVG: o RFC usa um conjunto pequeno e fixo, entao nao vale
// uma dependencia de biblioteca de icones.

type Props = { tamanho?: number; className?: string };

function Svg({ tamanho = 16, children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconeLampada(p: Props) {
  return (
    <Svg {...p}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
    </Svg>
  );
}

export function IconeDashboard(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  );
}

export function IconeFila(p: Props) {
  return (
    <Svg {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

export function IconeCaixa(p: Props) {
  return (
    <Svg {...p}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
    </Svg>
  );
}

export function IconeSeta(p: Props) {
  return (
    <Svg {...p}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

export function IconeWhatsApp(p: Props) {
  return (
    <svg
      width={p.tamanho ?? 15}
      height={p.tamanho ?? 15}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.1 13.9c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3-.8a11 11 0 0 1-4.5-4c-.3-.5-.9-1.5-.9-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.3c-.1.1-.2.3 0 .5a8 8 0 0 0 3.6 3c.3.1.4.1.6-.1l.8-1c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3.1.1.1.5 0 1Z" />
    </svg>
  );
}

export function IconeLapis(p: Props) {
  return (
    <Svg tamanho={p.tamanho ?? 14} className={p.className}>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Svg>
  );
}

export function IconeBusca(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

export function IconeTicket(p: Props) {
  return (
    <Svg {...p}>
      <path d="M8 2h8a2 2 0 0 1 2 2v17l-6-3-6 3V4a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function IconeAlerta(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </Svg>
  );
}

export function IconeDownload(p: Props) {
  return (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Svg>
  );
}

export function IconeMais(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
