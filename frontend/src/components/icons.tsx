/* Icones dessinees a la main plutot qu'une librairie : la PWA doit rester
 * autonome hors-ligne et legere (cf. TDR : "faibles ressources informatiques"),
 * et ces huit traces coutent moins qu'un paquet supplementaire au bundle. */

interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconDashboard({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </svg>
  );
}

export function IconClients({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.4 6.4 0 0 1 12.4 0" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 6" />
      <path d="M18 14.4a6 6 0 0 1 3.2 4.6" />
    </svg>
  );
}

export function IconAlert({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 8.8a6 6 0 1 0-12 0c0 5.2-2 6.8-2 6.8h16s-2-1.6-2-6.8" />
      <path d="M10.3 19.4a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconShield({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2.8 4.8 6v5.6c0 4.6 3 8.3 7.2 9.6 4.2-1.3 7.2-5 7.2-9.6V6Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </svg>
  );
}

export function IconList({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
      <circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWallet({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5a2 2 0 0 1 2 2v1.5" />
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2.4" />
      <circle cx="16.4" cy="13.2" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSearch({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.4 15.4 4.4 4.4" />
    </svg>
  );
}

export function IconTrend({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m3.5 15.5 5-5.5 4 3.5 5.5-6.5" />
      <path d="M14.5 7h4v4" />
    </svg>
  );
}

export function IconWarning({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 4.2 2.8 20h18.4Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLogout({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9.5 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3.5" />
      <path d="M15 8.5 18.5 12 15 15.5" />
      <path d="M18.5 12H9" />
    </svg>
  );
}
