/* Graphiques dessines a la main en SVG - pas de recharts ni d3. Deux formes
 * suffisent au tableau de bord (courbe de tendance, jauge), et une PWA destinee
 * a des postes modestes n'a pas a embarquer 200 ko de librairie pour ca. */

interface SparklineProps {
  values: number[];
  color?: string;
  label: string;
  height?: number;
}

/** Courbe de tendance compacte. S'etire en largeur (preserveAspectRatio="none")
 * mais garde un trait d'epaisseur constante grace a vector-effect. */
export function Sparkline({ values, color = "var(--chart-1)", label, height = 30 }: SparklineProps) {
  const w = 100;
  const h = 30;
  const pad = 3;

  if (values.length === 0) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = values.length > 1 ? index * step : w / 2;
    // Une serie entierement plate se dessine au milieu, pas ecrasee en bas :
    // sinon "aucune activite" et "activite constante" auraient le meme aspect.
    const y = max === min ? h / 2 : h - pad - ((value - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const [lastX, lastY] = points[points.length - 1];
  const gradientId = `spark-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface GaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

/** Jauge en demi-cercle du score de conformite. La couleur suit le score, elle
 * n'est pas decorative : rouge sous 50, ambre sous 75, vert au-dela. */
export function Gauge({ value, size = 168, label = "Score de conformite" }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 40;
  const arcLength = Math.PI * radius; // demi-cercle
  const filled = (clamped / 100) * arcLength;
  const color = clamped >= 75 ? "var(--teal)" : clamped >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <div style={{ width: size, flexShrink: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 100 62"
        width={size}
        height={size * 0.62}
        role="img"
        aria-label={`${label} : ${clamped} sur 100`}
      >
        <path
          d="M 10 52 A 40 40 0 0 1 90 52"
          fill="none"
          stroke="var(--line)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 10 52 A 40 40 0 0 1 90 52"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled.toFixed(2)} ${arcLength.toFixed(2)}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <text
          x="50"
          y="46"
          textAnchor="middle"
          fill="var(--ink)"
          fontSize="22"
          fontWeight="700"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {clamped}
        </text>
        <text x="50" y="58" textAnchor="middle" fill="var(--muted)" fontSize="8">
          / 100
        </text>
      </svg>
      <div className="muted" style={{ marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

interface MeterProps {
  label: string;
  value: number; // 0-100
  hint?: string;
}

/** Barre de progression d'un taux de conformite, avec la meme regle de couleur
 * que la jauge pour que l'oeil fasse le lien. */
export function Meter({ label, value, hint }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped >= 75 ? "" : clamped >= 50 ? " amber" : " red";
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span className="v">{clamped} %</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}
