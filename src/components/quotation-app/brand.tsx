/** Shared brand primitives that reproduce the Immense Smart Solution proposal template. */

import { AutoFit } from "./AutoFit";

export const NAVY = "#0f2a5f";
export const ORANGE = "#f2591f";

// Real static asset served from /public — portable across any host (Netlify, Cloudflare, etc.),
// unlike Lovable's internal "/__l5e/assets-v1/..." pointer which only resolves on Lovable's own domain.
const LOGO_ASPECT = 754 / 574; // actual icon height / width, keeps the mark from looking stretched

export function LogoMark({ size = 46 }: { size?: number }) {
  const width = size;
  const height = size * LOGO_ASPECT;
  return (
    <img
      src="/immense-air-icon.png"
      alt="Immense Air Pvt Ltd logo"
      width={width}
      height={height}
      style={{ width, height, objectFit: "contain", display: "block" }}
    />
  );
}

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="absolute right-[14mm] flex items-center gap-[3mm]"
      style={{ top: compact ? "10mm" : "12mm" }}
    >
      <LogoMark size={compact ? 40 : 48} />
      <div className="leading-none">
        <div
          className="font-display font-extrabold tracking-tight"
          style={{ color: NAVY, fontSize: compact ? "5.4mm" : "6mm" }}
        >
          IMMENSE AIR PVT LTD
        </div>
        <div className="mt-[1.6mm] font-semibold" style={{ fontSize: "3.1mm", color: NAVY }}>
          Smart Communication. <span style={{ color: ORANGE }}>Stronger Results.</span>
        </div>
      </div>
    </div>
  );
}

export function DotGrid({
  rows = 5,
  cols = 6,
  color = "#ffffff",
  gap = 4,
  dot = 1.4,
  className = "",
  style,
}: {
  rows?: number;
  cols?: number;
  color?: string;
  gap?: number;
  dot?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style} aria-hidden="true">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${gap}mm)`,
          gridTemplateRows: `repeat(${rows}, ${gap}mm)`,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <span
            key={i}
            style={{
              width: `${dot}mm`,
              height: `${dot}mm`,
              borderRadius: "999px",
              background: color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Navy blob that bleeds off the top-left corner of interior pages. */
export function CornerBlob() {
  return (
    <svg
      className="absolute left-0 top-0"
      width="270"
      height="165"
      viewBox="0 0 330 200"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 0h250c0 90-40 150-140 150C40 150 60 200 0 200V0Z" fill={NAVY} />
      <path
        d="M250 0c0 90-40 150-140 150C40 150 60 200 0 200"
        stroke={ORANGE}
        strokeWidth="7"
        fill="none"
      />
    </svg>
  );
}

/**
 * Two-tiered modern footer matching the reference design:
 * 1. Top row: 5 services (Bulk SMS, Bulk WhatsApp, Voice Calls, RCS SMS, Digital Marketing Services)
 * 2. Bottom row: Dual-tone curved banner (Smart Communication. Stronger Results. + Website)
 */
export function PageFooter({
  site = "www.immenseair.in",
  slogan = "Smart Communication. Stronger Results.",
  colorTheme = "navy",
}: {
  site?: string;
  slogan?: string;
  colorTheme?: "navy" | "brand" | "blue" | "duo";
}) {
  const displaySite = site.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const siteHref = `https://${displaySite}`;

  return (
    <div
      className="absolute inset-x-0 bottom-0 select-none z-10"
      style={{ height: "24mm" }}
      aria-hidden={false}
    >
      {/* 1. Services Top Strip (Clean white bar with 5 services and dividers) */}
      <div
        className="flex items-center justify-between px-[10mm]"
        style={{ height: "8.5mm", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}
      >
        {/* Bulk SMS */}
        <div className="flex items-center gap-[2.2mm]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#0066d6" strokeWidth="2.2" />
            <path
              d="M2.5 6.5L12 13.5L21.5 6.5"
              stroke="#0066d6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-semibold text-[#0a192f]" style={{ fontSize: "2.9mm" }}>
            Bulk SMS
          </span>
        </div>

        <div style={{ width: "1px", height: "4.5mm", background: "#cbd5e1" }} />

        {/* Bulk WhatsApp */}
        <div className="flex items-center gap-[2.2mm]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="10.5" fill="#25D366" />
            <path
              d="M17.2 14.2c-.25-.13-1.48-.73-1.7-.81-.23-.09-.4-.13-.57.13-.17.26-.65.81-.8 1-.15.17-.3.2-.55.07-.26-.13-1.1-.4-2.1-1.3-.77-.69-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.41 1.01 2.58c.13.17 1.75 2.68 4.25 3.75 2.5 1.07 2.5.72 2.95.67.45-.04 1.48-.6 1.69-1.19.21-.59.21-1.1.15-1.21-.06-.1-.23-.17-.49-.3z"
              fill="#ffffff"
            />
          </svg>
          <span className="font-semibold text-[#0a192f]" style={{ fontSize: "2.9mm" }}>
            Bulk WhatsApp
          </span>
        </div>

        <div style={{ width: "1px", height: "4.5mm", background: "#cbd5e1" }} />

        {/* Voice Calls */}
        <div className="flex items-center gap-[2.2mm]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M4.5 4h3.5l1.8 4.5-2.2 1.35a10.5 10.5 0 0 0 4.5 4.5l1.35-2.2L18 14v3.5a1.8 1.8 0 0 1-1.8 1.8A15 15 0 0 1 3 5.8 1.8 1.8 0 0 1 4.5 4z"
              fill="#0066d6"
            />
            <path
              d="M14 3.5a6 6 0 0 1 6 6"
              stroke="#0066d6"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M14 6.8a2.8 2.8 0 0 1 2.8 2.8"
              stroke="#0066d6"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-semibold text-[#0a192f]" style={{ fontSize: "2.9mm" }}>
            Voice Calls
          </span>
        </div>

        <div style={{ width: "1px", height: "4.5mm", background: "#cbd5e1" }} />

        {/* RCS SMS */}
        <div className="flex items-center gap-[2.2mm]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <rect x="2" y="3.5" width="20" height="14" rx="4.5" fill="#0080ff" />
            <path d="M6 17.5L3 21V17.5H6Z" fill="#0080ff" />
            <circle cx="7.8" cy="10.5" r="1.4" fill="#ffffff" />
            <circle cx="12" cy="10.5" r="1.4" fill="#ffffff" />
            <circle cx="16.2" cy="10.5" r="1.4" fill="#ffffff" />
          </svg>
          <span className="font-semibold text-[#0a192f]" style={{ fontSize: "2.9mm" }}>
            RCS SMS
          </span>
        </div>

        <div style={{ width: "1px", height: "4.5mm", background: "#cbd5e1" }} />

        {/* Digital Marketing Services */}
        <div className="flex items-center gap-[2.2mm]">
          <svg width="20" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <rect x="2" y="13" width="3.2" height="8" rx="0.8" fill="#00a3ff" />
            <rect x="7.2" y="9.5" width="3.2" height="11.5" rx="0.8" fill="#0080ff" />
            <rect x="12.4" y="6" width="3.2" height="15" rx="0.8" fill="#0062d6" />
            <rect x="17.6" y="2.5" width="3.2" height="18.5" rx="0.8" fill="#043ca6" />
            <path
              d="M3 10L8.5 5L13.5 8.5L20 2"
              stroke="#0066d6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 2H20V6"
              stroke="#0066d6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="leading-tight font-semibold text-[#0a192f]"
            style={{ fontSize: "2.7mm" }}
          >
            <div>Digital Marketing</div>
            <div>Services</div>
          </div>
        </div>
      </div>

      {/* 2. Bottom Wave Banner (Seamless Curved Geometry & Document Color Harmony) */}
      <div className="relative w-full overflow-hidden" style={{ height: "15.5mm" }}>
        <svg
          viewBox="0 0 794 56"
          className="absolute inset-0 block w-full h-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Theme: Logo Navy Blue (Exact #061e44 from Immense Air Logo) */}
            <linearGradient id="footerLogoNavyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#061e44" />
              <stop offset="45%" stopColor="#0a2a5e" />
              <stop offset="100%" stopColor="#0e3778" />
            </linearGradient>

            {/* Theme: Brand Orange */}
            <linearGradient id="footerBrandOrangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f26722" />
              <stop offset="50%" stopColor="#f57333" />
              <stop offset="100%" stopColor="#fa8749" />
            </linearGradient>

            {/* Theme: Reference Royal Blue */}
            <linearGradient id="footerRoyalBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#014ba0" />
              <stop offset="50%" stopColor="#0066d6" />
              <stop offset="100%" stopColor="#0084ff" />
            </linearGradient>

            {/* Theme: Duo Sapphire */}
            <linearGradient id="footerDuoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0052b4" />
              <stop offset="70%" stopColor="#006ee6" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Right Section Shape (Smoothly matched from x=374 at top to x=436 at bottom) */}
          <path
            d="M 794 0 L 794 56 L 436 56 C 420 28 402 4 374 0 L 794 0 Z"
            fill={
              colorTheme === "brand"
                ? "url(#footerBrandOrangeGrad)"
                : colorTheme === "blue"
                ? "url(#footerRoyalBlueGrad)"
                : colorTheme === "duo"
                ? "url(#footerDuoGrad)"
                : "url(#footerLogoNavyGrad)"
            }
          />

          {/* Left Navy Section Shape (Logo Navy #061e44) */}
          <path
            d="M 0 0 L 374 0 C 402 4 420 28 436 56 L 0 56 Z"
            fill="#061e44"
          />

          {/* White Ribbon Divider */}
          <path
            d="M 374 0 C 402 4 420 28 436 56"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Optional Orange Accent Stripe for Duo theme */}
          {colorTheme === "duo" && (
            <path
              d="M 380 0 C 408 4 426 28 442 56"
              stroke="#f26722"
              strokeWidth="2.5"
              fill="none"
            />
          )}
        </svg>

        {/* Content on Left: Slogan */}
        <div
          className="absolute flex items-center"
          style={{ left: "12mm", top: 0, bottom: 0 }}
        >
          <span
            className="italic font-extrabold text-white select-none tracking-wide"
            style={{ fontSize: "4.1mm" }}
          >
            {slogan.includes("Smart Communication") ? (
              <>
                <span>Smart Communication. </span>
                <span
                  style={{
                    color: colorTheme === "brand" ? "#ffffff" : "#f26722",
                    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  }}
                >
                  Stronger Results.
                </span>
              </>
            ) : (
              slogan
            )}
          </span>
        </div>

        {/* Content on Right: Globe & Website */}
        <a
          href={siteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute flex items-center gap-[2.4mm] text-white no-underline transition-opacity hover:opacity-90"
          style={{ right: "12mm", top: 0, bottom: 0 }}
        >
          <span
            className="flex items-center justify-center rounded-full bg-white/20"
            style={{ width: "6.2mm", height: "6.2mm" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </span>
          <span
            className="font-bold text-white tracking-wide"
            style={{ fontSize: "3.7mm" }}
          >
            {displaySite}
          </span>
        </a>
      </div>
    </div>
  );
}

export function Glyph({
  name,
  color = "#fff",
  size = 4,
}: {
  name: "globe" | "mail" | "phone" | "user" | "bank" | "pin" | "card" | "doc" | "check";
  color?: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-4 4-5.5 7-5.5S17.5 16 19 20" />
      </>
    ),
    bank: (
      <>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    doc: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  };
  return (
    <svg
      width={`${size}mm`}
      height={`${size}mm`}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/** Orange ribbon banner used as the section title on product pages. */
export function RibbonTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-[3mm]">
      <span style={{ width: "3mm", height: "3mm", borderRadius: 99, background: ORANGE, flexShrink: 0 }} />
      <span style={{ width: "14mm", height: "1mm", background: ORANGE, flexShrink: 0 }} />
      <div className="relative" style={{ background: ORANGE, maxWidth: "155mm" }}>
        <div style={{ padding: "2.6mm 10mm" }}>
          <AutoFit
            size={6.6}
            maxLines={1}
            lineHeight={1.1}
            align="center"
            className="font-display font-extrabold whitespace-nowrap"
            style={{ color: "#fff", width: "auto" }}
          >
            {children}
          </AutoFit>
        </div>
        <span
          className="absolute"
          style={{
            left: "-5mm",
            top: 0,
            bottom: 0,
            width: "5mm",
            background: ORANGE,
            clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
          }}
        />
        <span
          className="absolute"
          style={{
            right: "-5mm",
            top: 0,
            bottom: 0,
            width: "5mm",
            background: ORANGE,
            clipPath: "polygon(0 0, 0 100%, 100% 50%)",
          }}
        />
      </div>
      <span style={{ width: "14mm", height: "1mm", background: ORANGE, flexShrink: 0 }} />
      <span style={{ width: "3mm", height: "3mm", borderRadius: 99, background: ORANGE, flexShrink: 0 }} />
    </div>
  );
}
