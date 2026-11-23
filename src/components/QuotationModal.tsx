'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Lead, LeadQuotation, ServicePriceItem } from '@/types/crm';
import { generateQuotationPdfBlob, captureExactQuotationHtmlPdf } from '@/lib/pdfGenerator';
import {
  getDefaultQuotationState,
  ProductItem,
  PRODUCT_NAMES,
  QuotationState,
} from '@/lib/quotationData';

// Constants
export const BRAND_NAVY = '#0f2a5f';
export const BRAND_ORANGE = '#f2591f';
export const RATIO = 754 / 574;
const PX_PER_MM = 96 / 25.4;
const PAGE_WIDTH_PX = 210 * PX_PER_MM;
const PAGE_HEIGHT_PX = 297 * PX_PER_MM;

export const parseNumber = (val: string | number) =>
  Number(String(val).replace(/[^0-9.-]/g, '')) || 0;

export const formatINR = (val: string | number) => {
  const num = typeof val === 'number' ? val : parseNumber(val);
  return isFinite(num)
    ? num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(val);
};

export const computeProductTotal = (pricing: ProductItem['pricing']) => {
  const setup = parseNumber(pricing.setup);
  const monthly = parseNumber(pricing.monthly);
  const price = parseNumber(pricing.price);
  const gst = parseNumber(pricing.gst);
  const base = setup + monthly + price;
  return base + (base * gst) / 100;
};

// Selection / Focus context
const FocusContext = createContext<{
  highlight: string | null;
  onSelect?: (id: string) => void;
}>({ highlight: null });

function useFocusTarget(id: string, baseClass = '') {
  const { highlight, onSelect } = useContext(FocusContext);
  return {
    'data-focus': id,
    className: [
      baseClass,
      'focus-target',
      highlight === id ? 'focus-glow' : null,
    ]
      .filter(Boolean)
      .join(' '),
    onClick: onSelect ? () => onSelect(id) : undefined,
  };
}

// Auto-scaling text
export function AutoScaleText({
  children,
  size,
  maxLines = 2,
  minScale = 0.45,
  lineHeight = 1.18,
  className,
  style,
  align,
}: {
  children: React.ReactNode;
  size: number;
  maxLines?: number;
  minScale?: number;
  lineHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      let cur = size;
      const min = size * minScale;
      el.style.fontSize = `${cur}mm`;
      let it = 0;
      while (
        (el.scrollHeight > el.clientHeight + 0.6 ||
          el.scrollWidth > el.clientWidth + 0.6) &&
        cur > min &&
        it++ < 80
      ) {
        cur *= 0.95;
        el.style.fontSize = `${cur}mm`;
      }
    };
    run();
    const parent = el.parentElement;
    const obs = new ResizeObserver(() => run());
    if (parent) obs.observe(parent);
    return () => obs.disconnect();
  }, [children, size, minScale]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        fontSize: `${size}mm`,
        lineHeight,
        maxHeight: `${lineHeight * maxLines}em`,
        overflow: 'hidden',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        textAlign: align,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Immense Air Logo
export function ImmenseAirLogo({ size = 46 }: { size?: number }) {
  const w = size;
  const h = size * RATIO;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/immense-air-icon.png"
      alt="Immense Air Pvt Ltd logo"
      width={w}
      height={h}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}

// Corner Branding Header for Service & Contact pages
export function PageCornerHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="absolute right-[14mm] flex items-center gap-[3mm]"
      style={{ top: compact ? '10mm' : '12mm' }}
    >
      <ImmenseAirLogo size={compact ? 40 : 48} />
      <div className="leading-none">
        <div
          className="font-display font-extrabold tracking-tight"
          style={{
            color: BRAND_NAVY,
            fontSize: compact ? '5.4mm' : '6mm',
          }}
        >
          IMMENSE AIR PVT LTD
        </div>
        <div
          className="mt-[1.6mm] font-semibold"
          style={{ fontSize: '3.1mm', color: BRAND_NAVY }}
        >
          Smart Communication.{' '}
          <span style={{ color: BRAND_ORANGE }}>Stronger Results.</span>
        </div>
      </div>
    </div>
  );
}

// Dot Grid Background Pattern
export function DotGrid({
  rows = 5,
  cols = 6,
  color = '#ffffff',
  gap = 4,
  dot = 1.4,
  className = '',
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
              borderRadius: '999px',
              backgroundColor: color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Page Corner SVG Arch
export function CornerArch() {
  return (
    <svg
      className="absolute left-0 top-0"
      width="270"
      height="165"
      viewBox="0 0 330 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 0h250c0 90-40 150-140 150C40 150 60 200 0 200V0Z"
        fill={BRAND_NAVY}
      />
      <path
        d="M250 0c0 90-40 150-140 150C40 150 60 200 0 200"
        stroke={BRAND_ORANGE}
        strokeWidth="7"
        fill="none"
      />
    </svg>
  );
}

// Icon helper
export function SvgIcon({
  name,
  color = '#fff',
  size = 4,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const icons: Record<string, React.ReactNode> = {
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
    phone: (
      <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />
    ),
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
      {icons[name] || icons.globe}
    </svg>
  );
}

// Page Bottom Footer
export function PageWaveFooter({
  site = 'www.immenseair.in',
  email = 'info@immenseair.in',
  phone = '+91 2245 00 3131',
}: {
  site?: string;
  email?: string;
  phone?: string;
}) {
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const webHref = `https://${site.replace(/^https?:\/\//, '')}`;

  return (
    <div className="absolute inset-x-0" style={{ bottom: '1.5mm' }} aria-hidden={false}>
      <svg
        viewBox="0 0 794 70"
        className="block w-full"
        style={{ height: '20mm' }}
      >
        <path
          d="M0 34C160 4 300 60 470 34s230-34 324-14v50H0V34Z"
          fill={BRAND_ORANGE}
        />
        <path
          d="M0 44C160 14 300 70 470 44s230-34 324-14v40H0V44Z"
          fill={BRAND_NAVY}
        />
      </svg>
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-[6mm]"
        style={{
          height: '13mm',
          color: '#fff',
          fontSize: '3.3mm',
          fontWeight: 600,
        }}
      >
        <a
          href={webHref}
          className="flex items-center gap-[2.2mm]"
          style={{ color: '#fff', textDecoration: 'none' }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: '5.6mm',
              height: '5.6mm',
              backgroundColor: '#fff',
              flexShrink: 0,
            }}
          >
            <SvgIcon name="globe" color={BRAND_NAVY} size={3.3} />
          </span>
          <span style={{ letterSpacing: '0.01em' }}>{site}</span>
        </a>
        <span style={{ opacity: 0.45 }}>|</span>
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-[2.2mm]"
          style={{ color: '#fff', textDecoration: 'none' }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: '5.6mm',
              height: '5.6mm',
              backgroundColor: '#fff',
              flexShrink: 0,
            }}
          >
            <SvgIcon name="mail" color={BRAND_NAVY} size={3.3} />
          </span>
          <span style={{ letterSpacing: '0.01em' }}>{email}</span>
        </a>
        <span style={{ opacity: 0.45 }}>|</span>
        <a
          href={telHref}
          className="flex items-center gap-[2.2mm]"
          style={{ color: '#fff', textDecoration: 'none' }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: '5.6mm',
              height: '5.6mm',
              backgroundColor: '#fff',
              flexShrink: 0,
            }}
          >
            <SvgIcon name="phone" color={BRAND_NAVY} size={3.3} />
          </span>
          <span style={{ letterSpacing: '0.01em' }}>{phone}</span>
        </a>
      </div>
    </div>
  );
}

// Ribbon Title Banner with triangle cutouts
export function RibbonTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-[3mm]">
      <span
        style={{
          width: '3mm',
          height: '3mm',
          borderRadius: 99,
          backgroundColor: BRAND_ORANGE,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          width: '14mm',
          height: '1mm',
          backgroundColor: BRAND_ORANGE,
          flexShrink: 0,
        }}
      />
      <div
        className="relative"
        style={{ backgroundColor: BRAND_ORANGE, maxWidth: '155mm' }}
      >
        <div style={{ padding: '2.6mm 10mm' }}>
          <AutoScaleText
            size={6.6}
            maxLines={1}
            lineHeight={1.1}
            align="center"
            className="font-display font-extrabold whitespace-nowrap"
            style={{ color: '#fff', width: 'auto' }}
          >
            {children}
          </AutoScaleText>
        </div>
        <span
          className="absolute"
          style={{
            left: '-5mm',
            top: 0,
            bottom: 0,
            width: '5mm',
            backgroundColor: BRAND_ORANGE,
            clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
          }}
        />
        <span
          className="absolute"
          style={{
            right: '-5mm',
            top: 0,
            bottom: 0,
            width: '5mm',
            backgroundColor: BRAND_ORANGE,
            clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
          }}
        />
      </div>
      <span
        style={{
          width: '14mm',
          height: '1mm',
          backgroundColor: BRAND_ORANGE,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          width: '3mm',
          height: '3mm',
          borderRadius: 99,
          backgroundColor: BRAND_ORANGE,
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// Table cell helpers
export function TableHeader({
  children,
  small,
  align = 'center',
  width,
}: {
  children: React.ReactNode;
  small?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}) {
  return (
    <th
      style={{
        backgroundColor: BRAND_NAVY,
        color: '#fff',
        padding: small ? '2.6mm' : '3.4mm',
        fontWeight: 600,
        textAlign: align,
        width,
        overflowWrap: 'anywhere',
        border: '0.3mm solid #fff',
      }}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  small,
  highlight,
  align = 'center',
  style,
}: {
  children: React.ReactNode;
  small?: boolean;
  highlight?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: small ? '2.6mm' : '3.4mm',
        textAlign: align,
        fontWeight: 600,
        color: highlight ? BRAND_ORANGE : BRAND_NAVY,
        overflowWrap: 'anywhere',
        border: '0.3mm solid #d7dce7',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

// Card in Cover Page
function ClientPartnerCard({
  label,
  value,
  bg,
  focusId,
}: {
  label: string;
  value: string;
  bg: string;
  focusId: string;
}) {
  const focusProps = useFocusTarget(focusId, 'flex flex-1 items-center gap-[3.5mm] min-w-0');
  return (
    <div {...focusProps}>
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: '13mm',
          height: '13mm',
          backgroundColor: bg,
          flexShrink: 0,
        }}
      >
        <SvgIcon name="user" size={7} />
      </span>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: '3mm', color: '#6c7789' }}>{label}</div>
        <AutoScaleText
          size={6}
          maxLines={2}
          className="font-display font-extrabold"
          style={{ color: BRAND_ORANGE }}
        >
          {value}
        </AutoScaleText>
      </div>
    </div>
  );
}

// ==========================================
// 1. Cover Page Component
// ==========================================
export function CoverPage({ data }: { data: QuotationState }) {
  const services = ['CPaaS', 'SMS & RCS', 'WhatsApp', 'Voice & IVR', 'Email & SMPP'];
  const proposalFocus = useFocusTarget('client:proposal');
  const dateFocus = useFocusTarget('client:date');

  return (
    <section
      id="page-cover"
      data-page="cover"
      className="a4-page shadow-page"
    >
      {/* Top right decorative wave */}
      <svg
        className="absolute right-0 top-0"
        width="420"
        height="430"
        viewBox="0 0 420 430"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M160 0h260v430c-90-40-40-150-120-220C230 150 120 120 160 0Z"
          fill={BRAND_NAVY}
        />
        <path
          d="M120 0c-30 130 80 155 160 215 80 62 30 175 120 215"
          stroke={BRAND_ORANGE}
          strokeWidth="9"
          fill="none"
        />
      </svg>

      <DotGrid
        className="absolute right-[16mm] top-[10mm]"
        rows={5}
        cols={6}
        gap={4.4}
      />

      <div className="absolute left-[16mm] top-[13mm] flex items-center gap-[4mm]">
        <ImmenseAirLogo size={58} />
        <div className="leading-none">
          <div
            className="font-display font-extrabold"
            style={{ color: BRAND_NAVY, fontSize: '8mm' }}
          >
            IMMENSE AIR
          </div>
          <div
            className="font-display font-extrabold mt-[1.5mm]"
            style={{ color: BRAND_ORANGE, fontSize: '8mm' }}
          >
            PVT LTD
          </div>
        </div>
      </div>

      <div
        className="absolute left-[16mm] top-[38mm]"
        style={{ fontSize: '4mm', color: BRAND_NAVY }}
      >
        <span className="font-semibold">Smart Communication. </span>
        <span className="font-semibold" style={{ color: BRAND_ORANGE }}>
          Stronger Results.
        </span>
        <div
          style={{
            width: '24mm',
            height: '1.1mm',
            backgroundColor: BRAND_ORANGE,
            marginTop: '3mm',
          }}
        />
      </div>

      <h1
        className="absolute left-[16mm] top-[55mm] font-display font-black leading-[0.88]"
        style={{ fontSize: '21mm', letterSpacing: '-0.4mm' }}
      >
        <span style={{ color: BRAND_NAVY, display: 'block' }}>BUSINESS</span>
        <span style={{ color: BRAND_ORANGE, display: 'block' }}>PROPOSAL</span>
      </h1>

      <div className="absolute left-[16mm] top-[110mm] flex items-center gap-[3mm]">
        <span
          style={{ width: '26mm', height: '1.6mm', backgroundColor: BRAND_NAVY }}
        />
        <span
          style={{ width: '16mm', height: '1.6mm', backgroundColor: BRAND_ORANGE }}
        />
        <span
          style={{ width: '18mm', height: '1.6mm', backgroundColor: BRAND_NAVY }}
        />
        {[BRAND_NAVY, BRAND_ORANGE, BRAND_NAVY].map((c, idx) => (
          <span
            key={idx}
            style={{
              width: '2.4mm',
              height: '2.4mm',
              borderRadius: 99,
              backgroundColor: c,
            }}
          />
        ))}
      </div>

      <div className="absolute right-[14mm] top-[92mm]">
        <svg
          width="200"
          height="200"
          viewBox="0 0 230 230"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="115" cy="115" r="112" stroke="#e8ecf4" strokeWidth="2" />
          <circle cx="115" cy="115" r="88" stroke="#f6d9cc" strokeWidth="2" />
          <rect
            x="78"
            y="60"
            width="76"
            height="96"
            rx="6"
            stroke={BRAND_NAVY}
            strokeWidth="5"
            fill="#fff"
          />
          <path
            d="M92 84h48M92 100h48M92 116h30"
            stroke={BRAND_NAVY}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M70 130c10-8 20-4 28 4l16 14c5 5 2 12-5 12-4 0-8-2-12-6"
            stroke={BRAND_NAVY}
            strokeWidth="5"
            fill="#fff"
            strokeLinejoin="round"
          />
          <circle cx="158" cy="124" r="22" fill={BRAND_ORANGE} />
          <path
            d="m148 124 7 7 13-14"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      <p
        className="absolute left-[16mm] top-[122mm] leading-[1.75]"
        style={{ width: '88mm', fontSize: '3.6mm', color: '#3c4a63' }}
      >
        We are pleased to present our Communication Solutions that empower your
        business to connect, engage, and grow faster with our reliable and
        innovative messaging services.
      </p>

      <div
        className="absolute left-[16mm] flex items-stretch"
        style={{
          top: '158mm',
          width: '120mm',
          border: `0.4mm solid ${BRAND_NAVY}`,
          borderRadius: '3mm',
          padding: '4mm',
        }}
      >
        <ClientPartnerCard
          focusId="client:name"
          label="Prepared For"
          value={data.client.clientName || '—'}
          bg={BRAND_ORANGE}
        />
        <span
          style={{ width: '0.3mm', backgroundColor: '#d9dee9', margin: '0 5mm' }}
        />
        <ClientPartnerCard
          focusId="client:company"
          label="Our Valued Partner"
          value={data.client.companyName || '—'}
          bg={BRAND_NAVY}
        />
      </div>

      <div
        className="absolute left-[16mm] flex items-center justify-between"
        style={{
          top: '190mm',
          width: '120mm',
          backgroundColor: '#f4f6fa',
          borderRadius: '2.5mm',
          padding: '3mm 5mm',
          fontSize: '3.2mm',
          color: BRAND_NAVY,
        }}
      >
        <span
          {...proposalFocus}
          style={{ maxWidth: '60mm', overflow: 'hidden' }}
        >
          <span style={{ color: '#7b8699' }}>Proposal No: </span>
          <strong>{data.client.proposalNumber || '—'}</strong>
        </span>
        <span {...dateFocus}>
          <span style={{ color: '#7b8699' }}>Date: </span>
          <strong>{data.client.date || '—'}</strong>
        </span>
      </div>

      <div
        className="absolute left-[16mm] flex items-center justify-between"
        style={{
          top: '206mm',
          width: '178mm',
          backgroundColor: '#f4f6fa',
          borderRadius: '3mm',
          padding: '5mm 4mm',
        }}
      >
        {services.map((svc, idx) => (
          <div
            key={svc}
            className="flex flex-1 flex-col items-center gap-[2.5mm]"
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: '15mm',
                height: '15mm',
                backgroundColor: idx % 2 === 1 ? BRAND_ORANGE : BRAND_NAVY,
              }}
            >
              <SvgIcon
                name={['mail', 'phone', 'check', 'phone', 'doc'][idx]}
                size={7}
              />
            </span>
            <span
              className="font-semibold"
              style={{ fontSize: '3.2mm', color: BRAND_NAVY }}
            >
              {svc}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute left-[16mm] flex" style={{ top: '242mm' }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: '36mm',
            height: '26mm',
            backgroundColor: BRAND_ORANGE,
            borderRadius: '2mm 0 0 2mm',
          }}
        >
          <svg
            width="60"
            height="46"
            viewBox="0 0 60 46"
            fill="none"
            aria-hidden="true"
          >
            <path d="M56 4 6 24l20 6 4 14 10-16 16-24Z" fill="#fff" />
          </svg>
        </div>
        <div
          style={{
            width: '84mm',
            backgroundColor: BRAND_NAVY,
            borderRadius: '0 2mm 2mm 0',
            padding: '3.5mm 6mm',
          }}
        >
          <div
            className="font-semibold"
            style={{ color: '#fff', fontSize: '4.4mm' }}
          >
            Smart Communication.
          </div>
          <div
            className="font-bold"
            style={{ color: BRAND_ORANGE, fontSize: '4.6mm' }}
          >
            Stronger Results.
          </div>
          <div
            style={{
              height: '0.5mm',
              backgroundColor: BRAND_ORANGE,
              margin: '1.5mm 0',
            }}
          />
          <div style={{ color: '#fff', fontSize: '2.8mm' }}>
            Powerful Solutions. Better Connections.
          </div>
        </div>
      </div>

      <PageWaveFooter />
    </section>
  );
}

// ==========================================
// 2. Individual Service Product Page
// ==========================================
export function ServicePage({ product }: { product: ProductItem }) {
  const autoTotal = computeProductTotal(product.pricing);
  const key = product.key;
  const titleFocus = useFocusTarget(`${key}:title`, 'absolute inset-x-0');
  const introFocus = useFocusTarget(
    `${key}:intro`,
    'absolute text-center leading-[1.8]'
  );
  const subFocus = useFocusTarget(
    `${key}:sub`,
    'absolute flex items-center justify-center'
  );
  const pricingFocus = useFocusTarget(`${key}:pricing`, '');
  const bulletsFocus = useFocusTarget(`${key}:bullets`, '');

  const hasPricingTable =
    product.pricing.setup !== '0' ||
    product.pricing.monthly !== '0' ||
    product.pricing.price !== '0' ||
    (product.pricing.total && Number(product.pricing.total) > 0);

  return (
    <section
      id={`page-${key}`}
      data-page={key}
      className="a4-page shadow-page"
    >
      <CornerArch />
      <DotGrid
        className="absolute left-[12mm] top-[8mm]"
        rows={4}
        cols={6}
        gap={4.2}
      />
      <PageCornerHeader compact />
      <DotGrid
        className="absolute right-[8mm] top-[105mm]"
        rows={4}
        cols={4}
        gap={4}
        dot={1.2}
        color="#d6dbe6"
      />

      <div {...titleFocus} style={{ top: '39mm' }}>
        <RibbonTitle>{product.title}</RibbonTitle>
      </div>

      <p
        {...introFocus}
        style={{
          left: '24mm',
          right: '24mm',
          top: '57mm',
          fontSize: '3.4mm',
          color: '#3c4a63',
          lineHeight: 1.65,
        }}
      >
        <strong style={{ color: BRAND_NAVY }}>Immense Smart Solution</strong>{' '}
        {product.intro.replace(/^Immense Smart Solution\s*/, '')}
      </p>

      <div
        {...subFocus}
        style={{
          left: '20mm',
          right: '20mm',
          top: '85mm',
        }}
      >
        <span
          className="absolute left-0 flex items-center justify-center rounded-full font-bold"
          style={{
            width: '17mm',
            height: '17mm',
            border: `1.4mm solid ${BRAND_NAVY}`,
            color: BRAND_NAVY,
            fontSize: '3.4mm',
          }}
        >
          {product.badge}
        </span>
        <div className="flex items-center justify-center gap-[3.5mm]">
          <span
            style={{
              width: '14mm',
              height: '0.8mm',
              backgroundColor: BRAND_ORANGE,
            }}
          />
          <span
            style={{
              width: '2.6mm',
              height: '2.6mm',
              borderRadius: 99,
              backgroundColor: BRAND_ORANGE,
            }}
          />
          <span className="min-w-0" style={{ maxWidth: '110mm' }}>
            <AutoScaleText
              size={5.8}
              maxLines={1}
              align="center"
              className="font-display font-extrabold whitespace-nowrap"
              style={{ color: BRAND_ORANGE }}
            >
              {product.subTitle}
            </AutoScaleText>
          </span>
          <span
            style={{
              width: '2.6mm',
              height: '2.6mm',
              borderRadius: 99,
              backgroundColor: BRAND_ORANGE,
            }}
          />
          <span
            style={{
              width: '14mm',
              height: '0.8mm',
              backgroundColor: BRAND_ORANGE,
            }}
          />
        </div>
      </div>

      <div
        className="absolute flex flex-col"
        style={{
          left: '20mm',
          right: '20mm',
          top: '106mm',
          bottom: '24mm',
          overflow: 'hidden',
        }}
      >
        <div
          {...pricingFocus}
          style={{
            marginLeft: '4mm',
            marginRight: '4mm',
            flexShrink: 0,
          }}
        >
          {product.tables.map((tbl, ti) => (
            <table
              key={ti}
              className="w-full"
              style={{
                borderCollapse: 'collapse',
                marginBottom: '4mm',
                fontSize: '3.5mm',
                border: `0.35mm solid ${BRAND_NAVY}`,
              }}
            >
              <thead>
                <tr>
                  <TableHeader width="62%" align="center">
                    {tbl.slabLabel || 'Credit Slab'}
                  </TableHeader>
                  <TableHeader width="38%" align="center">
                    {tbl.rateLabel || 'Rate'}
                  </TableHeader>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <TableCell
                    align="center"
                    style={{ fontWeight: 600 }}
                  >
                    {tbl.slabValue}
                  </TableCell>
                  <TableCell
                    align="center"
                    style={{ fontWeight: 700 }}
                  >
                    {tbl.rateValue}
                  </TableCell>
                </tr>
              </tbody>
            </table>
          ))}

          {product.agentLimitValue &&
            product.agentLimitValue.trim() !== '' && (
              <table
                className="w-full"
                style={{
                  borderCollapse: 'collapse',
                  marginBottom: '4mm',
                  fontSize: '3.5mm',
                  border: `0.35mm solid ${BRAND_NAVY}`,
                }}
              >
                <thead>
                  <tr>
                    <TableHeader width="100%" align="center">
                      {product.agentLimitLabel || 'Total Agent Limit'}
                    </TableHeader>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <TableCell
                      align="center"
                      style={{ fontWeight: 700 }}
                    >
                      {product.agentLimitValue}
                    </TableCell>
                  </tr>
                </tbody>
              </table>
            )}

          {hasPricingTable && (
            <table
              className="w-full"
              style={{
                borderCollapse: 'collapse',
                fontSize: '3.3mm',
                marginBottom: '4mm',
              }}
            >
              <thead>
                <tr>
                  <TableHeader small>
                    {product.pricing.setupLabel || 'Setup Charges'}
                  </TableHeader>
                  <TableHeader small>
                    {product.pricing.monthlyLabel || 'Monthly Charges'}
                  </TableHeader>
                  <TableHeader small>
                    {product.pricing.priceLabel || 'Price'}
                  </TableHeader>
                  <TableHeader small>
                    {product.pricing.gstLabel || 'GST (%)'}
                  </TableHeader>
                  <TableHeader small>
                    {product.pricing.totalLabel || 'Final Total'}
                  </TableHeader>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <TableCell small>
                    ₹ {formatINR(product.pricing.setup)}
                  </TableCell>
                  <TableCell small>
                    ₹ {formatINR(product.pricing.monthly)}
                  </TableCell>
                  <TableCell small>
                    ₹ {formatINR(product.pricing.price)}
                  </TableCell>
                  <TableCell small>
                    {product.pricing.gst}%
                  </TableCell>
                  <TableCell small highlight>
                    ₹{' '}
                    {product.pricing.total && Number(product.pricing.total) > 0
                      ? formatINR(product.pricing.total)
                      : formatINR(autoTotal)}
                  </TableCell>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <ul
          {...bulletsFocus}
          style={{
            marginLeft: '4mm',
            marginTop: key === 'cpaas' ? '6mm' : '8mm',
            overflow: 'hidden',
            fontSize: '3.35mm',
            color: '#33405a',
            flex: 1,
            minHeight: 0,
          }}
        >
          {product.bullets.slice(0, 13).map((bullet, bi) => (
            <li
              key={bi}
              className="flex gap-[3.5mm]"
              style={{ marginBottom: '3.2mm' }}
            >
              <span
                style={{
                  width: '2.2mm',
                  height: '2.2mm',
                  borderRadius: 99,
                  backgroundColor: BRAND_NAVY,
                  marginTop: '1.8mm',
                  flexShrink: 0,
                }}
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <PageWaveFooter />
    </section>
  );
}

// ==========================================
// 3. Contact Us & Terms Page
// ==========================================
export function ContactPage({ data }: { data: QuotationState }) {
  const bankRows = [
    ['Acc Name', 'Immense Air Private Limited', 'user'],
    ['Bank name', 'ICICI Bank', 'bank'],
    ['Account Number', '777705101366', 'card'],
    ['IFSC Code', 'ICIC0001218', 'doc'],
  ];

  const managerFocus = useFocusTarget(
    'manager:card',
    'absolute flex gap-[6mm]'
  );
  const footerFocus = useFocusTarget('contact:footer', 'absolute text-center');

  return (
    <section
      id="page-contact"
      data-page="contact"
      className="a4-page shadow-page"
    >
      <CornerArch />
      <DotGrid
        className="absolute left-[12mm] top-[8mm]"
        rows={4}
        cols={6}
        gap={4.2}
      />
      <PageCornerHeader compact />

      <div
        className="absolute inset-x-0 flex items-center justify-center gap-[4mm]"
        style={{ top: '38mm' }}
      >
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <span
          style={{
            width: '16mm',
            height: '1mm',
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <h2
          className="font-display font-black"
          style={{ color: BRAND_ORANGE, fontSize: '13mm' }}
        >
          Contact Us
        </h2>
        <span
          style={{
            width: '16mm',
            height: '1mm',
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
      </div>

      <div
        {...managerFocus}
        style={{ left: '26mm', right: '26mm', top: '62mm' }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: '18mm',
            height: '18mm',
            backgroundColor: BRAND_NAVY,
            flexShrink: 0,
          }}
        >
          <SvgIcon name="user" size={10} />
        </span>
        <div
          className="min-w-0 flex-1"
          style={{
            borderLeft: `0.5mm solid ${BRAND_ORANGE}`,
            paddingLeft: '5mm',
            maxWidth: '120mm',
          }}
        >
          <AutoScaleText
            size={5.4}
            maxLines={2}
            className="font-bold"
            style={{ color: BRAND_NAVY }}
          >
            {data.manager.name || '—'}
          </AutoScaleText>
          <AutoScaleText
            size={3.8}
            maxLines={2}
            style={{ color: '#3c4a63', marginTop: '1mm' }}
          >
            {data.manager.designation}
          </AutoScaleText>
          <div
            className="flex min-w-0 items-center gap-[2.5mm]"
            style={{ marginTop: '2.5mm' }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: '5.6mm',
                height: '5.6mm',
                backgroundColor: BRAND_ORANGE,
                flexShrink: 0,
              }}
            >
              <SvgIcon name="phone" size={3.2} />
            </span>
            <AutoScaleText
              size={3.7}
              maxLines={1}
              style={{ color: BRAND_NAVY }}
            >
              {data.manager.mobile}
            </AutoScaleText>
          </div>
          <div
            className="flex min-w-0 items-center gap-[2.5mm]"
            style={{ marginTop: '2mm' }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: '5.6mm',
                height: '5.6mm',
                backgroundColor: BRAND_ORANGE,
                flexShrink: 0,
              }}
            >
              <SvgIcon name="mail" size={3.2} />
            </span>
            <AutoScaleText
              size={3.7}
              maxLines={1}
              style={{ color: '#1857c8' }}
            >
              {data.manager.email}
            </AutoScaleText>
          </div>
        </div>
      </div>

      <div
        className="absolute flex items-center gap-[5mm]"
        style={{ left: '26mm', right: '22mm', top: '100mm' }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: '15mm',
            height: '15mm',
            backgroundColor: BRAND_NAVY,
            flexShrink: 0,
          }}
        >
          <SvgIcon name="bank" size={8} />
        </span>
        <h3
          className="font-display font-extrabold"
          style={{ color: BRAND_ORANGE, fontSize: '6.6mm' }}
        >
          Bank Account Details:
        </h3>
        <span
          style={{ flex: 1, height: '0.7mm', backgroundColor: BRAND_ORANGE }}
        />
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
      </div>

      <div
        className="absolute"
        style={{
          left: '34mm',
          right: '26mm',
          top: '118mm',
          border: '0.3mm solid #dfe4ee',
          borderRadius: '3mm',
          padding: '3mm 5mm',
        }}
      >
        {bankRows.map(([lbl, val, ic], idx) => (
          <div
            key={lbl}
            className="flex items-center gap-[4mm]"
            style={{
              padding: '1.4mm 0',
              borderBottom:
                idx < bankRows.length - 1 ? '0.25mm solid #edf0f5' : 'none',
              fontSize: '3.5mm',
            }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: '6.4mm',
                height: '6.4mm',
                backgroundColor: BRAND_NAVY,
                flexShrink: 0,
              }}
            >
              <SvgIcon name={ic} size={3.6} />
            </span>
            <span
              className="font-semibold"
              style={{ color: BRAND_NAVY, width: '38mm' }}
            >
              {lbl}
            </span>
            <span style={{ color: BRAND_NAVY }}>:</span>
            <span style={{ color: '#3c4a63' }}>{val}</span>
          </div>
        ))}
      </div>

      <div
        className="absolute flex items-center gap-[5mm]"
        style={{ left: '26mm', right: '22mm', top: '184mm' }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: '14mm',
            height: '14mm',
            backgroundColor: BRAND_NAVY,
            flexShrink: 0,
          }}
        >
          <SvgIcon name="doc" size={7.5} />
        </span>
        <h3
          className="font-display font-extrabold"
          style={{ color: BRAND_ORANGE, fontSize: '6.2mm' }}
        >
          Terms &amp; Conditions: -
        </h3>
        <span
          style={{ flex: 1, height: '0.7mm', backgroundColor: BRAND_ORANGE }}
        />
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
      </div>

      <ul
        className="absolute"
        style={{
          left: '42mm',
          top: '198mm',
          fontSize: '3.5mm',
          color: '#33405a',
        }}
      >
        {[
          'No Service taxes.',
          'Rates are non-negotiable.',
          'Payment Terms is postpaid.',
          'All Payment In favor of Immense Smart Solutions.',
        ].map((t) => (
          <li key={t} className="flex gap-[3mm]" style={{ marginBottom: '2.2mm' }}>
            <span
              style={{
                width: '2mm',
                height: '2mm',
                borderRadius: 99,
                backgroundColor: BRAND_NAVY,
                marginTop: '1.7mm',
              }}
            />
            {t}
          </li>
        ))}
      </ul>

      <div
        className="absolute inset-x-0 flex items-center justify-center gap-[4mm]"
        style={{ top: '228mm' }}
      >
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <span
          style={{
            width: '16mm',
            height: '1mm',
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <span
          className="font-display font-black"
          style={{ color: BRAND_ORANGE, fontSize: '12mm' }}
        >
          Thank You
        </span>
        <span
          style={{
            width: '16mm',
            height: '1mm',
            backgroundColor: BRAND_ORANGE,
          }}
        />
        <span
          style={{
            width: '3mm',
            height: '3mm',
            borderRadius: 99,
            backgroundColor: BRAND_ORANGE,
          }}
        />
      </div>

      <div
        className="absolute text-center"
        style={{
          left: '24mm',
          right: '24mm',
          top: '242mm',
          fontSize: '3.2mm',
          color: '#33405a',
        }}
      >
        24/7 Support Center: Call us on +91 8898648592 | +91 8097018757: Or Mail us on support@immenseair.in
        <div
          className="font-semibold italic"
          style={{ color: BRAND_NAVY, marginTop: '2.5mm' }}
        >
          “Any Changes in rules and Regulations by Company, TRAI or Operator will be Applicable with effect from the date communicated”
        </div>
      </div>

      <div
        {...footerFocus}
        style={{
          left: '20mm',
          right: '20mm',
          top: '265.5mm',
          fontSize: '3mm',
          color: '#33405a',
          lineHeight: 1.4,
        }}
      >
        <div>
          02240136508 &nbsp;|&nbsp;{' '}
          <span style={{ color: '#1857c8' }}>info@immenseair.in</span> &nbsp;|&nbsp;{' '}
          <span style={{ color: '#1857c8' }}>www.immenseair.in</span>
        </div>
        <div>9 Business Bay, Office 404, Off Link Road, Malad West, Mumbai, 400064</div>
      </div>

      <PageWaveFooter />
    </section>
  );
}

// ==========================================
// Form Control Components (Left Side Editor)
// ==========================================
function FormInput({
  label,
  value,
  onChange,
  onFocusPreview,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onFocusPreview?: () => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onFocus={onFocusPreview}
        onChange={(e) => {
          onChange(e.target.value);
          onFocusPreview?.();
        }}
        className="w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-navy outline-none transition-all placeholder:text-brand-ink/35 focus:border-navy focus:ring-4 focus:ring-navy/10"
      />
    </label>
  );
}

function SectionPanel({
  title,
  subtitle,
  children,
  right,
  innerRef,
  active,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  innerRef?: (el: HTMLElement | null) => void;
  active?: boolean;
}) {
  return (
    <section
      ref={innerRef}
      className={`fade-up scroll-mt-24 rounded-2xl border bg-white p-5 shadow-panel transition-colors ${
        active
          ? 'border-navy/60 ring-4 ring-navy/10'
          : 'border-brand-line'
      }`}
    >
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-navy">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-brand-ink/60">{subtitle}</p>
          )}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function PreviewEyeButton({
  onClick,
  title,
}: {
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-line bg-white text-brand-ink/60 transition-colors hover:border-navy hover:text-navy cursor-pointer"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 cursor-pointer ${
        on ? 'bg-navy' : 'bg-brand-line'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function ZoomButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'border-navy bg-navy text-white'
          : 'border-brand-line bg-white text-brand-ink/70 hover:border-navy/40 hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}

// ========================================================
// Compatibility Adapter for Lead Section
// ========================================================
export interface ServiceTemplate {
  rate: number;
  count: number;
  setupCharges: number;
  monthlyCharges: number;
  badge: string;
  heading: string;
  intro: string;
  rateLabel: string;
  bullets: string[];
}

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  'Bulk SMS (DLT)': {
    rate: 0.0675,
    count: 100000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'SMS',
    heading: 'SMS Services & Pricing',
    intro:
      'Immense Smart Solution offers competitive SMS services designed to meet your business communication needs. Our services are routed through reliable promotional routes, ensuring the swift and secure delivery of your messages.',
    rateLabel: 'Per SMS',
    bullets: [
      'You will be charged only for delivered SMS.',
      'Undelivered credits will be refunded within 24 hours.',
      'Delivery: Non-DND & Partial DND Numbers.',
      'Delivery Ratio: 100%',
      'SMS Sending Time: 24 Hrs.',
      'DLT & Templates Support.',
      'Content approval TAT: 15 Minutes.',
      'Easy to use interface.',
      'REST API available with Postman collection and JSON format for easy integration.',
      'Comprehensive API documentation and sample requests are available.',
      'Technical assistance is available during the integration process.',
    ],
  },
  'RCS Messaging': {
    rate: 0.1,
    count: 100000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'RCS',
    heading: 'RCS Business Messaging',
    intro:
      'Immense Smart Solution delivers verified RCS Business Messaging with rich media, carousels and action buttons — giving your brand a trusted identity inside the native messaging inbox.',
    rateLabel: 'Per RCS',
    bullets: [
      'Agent: Promotional — Time: 10 AM to 7 PM (7 days a week).',
      'Message Limit: Four (4) messages per brand per user per month.',
      'Onboarding: GST Certificate, Company PAN / CIN.',
      'Logo Image (224x224 px, under 90KB — JPEG, JPG, PNG).',
      'Banner Image (1440x448 px, under 360KB — JPEG, JPG, PNG).',
      'Rich communication experience with higher engagement.',
      'Verified business identity.',
      'Secure & reliable messaging.',
    ],
  },
  'WhatsApp Business API': {
    rate: 0.8,
    count: 50000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'WABA',
    heading: 'Meta WhatsApp Services & Pricing',
    intro:
      'Immense Smart Solution offers official Meta WhatsApp Business API services to help businesses engage, communicate and grow. Our Meta WhatsApp solution is reliable, secure and built to deliver better customer conversations at scale.',
    rateLabel: 'Per WhatsApp',
    bullets: [
      'No Conversations Free BIC (Business Incoming).',
      'Free WhatsApp API Approval & Setup.',
      'Chat Automation.',
      'Bulk WhatsApp campaign notifications & campaign analytics.',
      '24 hours conversation window if same template is sent within the window.',
      'Zero Rental Charges.',
      'Zero Annual Maintenance Charges (AMC).',
      'Zero Hidden Charges.',
      'Transparent & Hassle-Free Pricing.',
    ],
  },
  'Virtual WhatsApp': {
    rate: 0.1,
    count: 100000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'V-WA',
    heading: 'Virtual WhatsApp Services',
    intro:
      'Immense Smart Solution offers Virtual WhatsApp services powered by the official WhatsApp Business API. Engage your customers with real conversations, rich media and automated messaging. Perfect for real estate and growing businesses.',
    rateLabel: 'Per WhatsApp',
    bullets: [
      'Sender ID virtual Mobile number.',
      'Image size: - No limit.',
      '4 image & text Will Charged 1 credit.',
      'PDF & Video Not Supported.',
      'Working Hour 10 AM to 7 PM (7 days a week).',
      'Delivery On Non DND & DND Numbers.',
      'Zero Rental Charges.',
      'Zero Annual Maintenance Charges (AMC).',
      'Zero Hidden Charges.',
      'Transparent & Hassle-Free Pricing.',
    ],
  },
  'CPaaS Omni Communication': {
    rate: 0.2,
    count: 50000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'CPaaS',
    heading: 'CPaaS Omni Communication Panel',
    intro:
      'Immense Smart Solution offers a unified CPaaS platform to manage SMS, RCS, WhatsApp, Voice and Email from a single dashboard. Our intelligent failover ensures your message is delivered through the best available channel, giving you higher reach and better results.',
    rateLabel: 'Average Rate',
    bullets: [
      'Automatic failover from SMS → RCS → WhatsApp.',
      'You pay only for the final successfully delivered message.',
      'One customer = One count, irrespective of the channel used.',
      'Single dashboard to manage all communication channels.',
      'Real-time delivery reports and analytics.',
      'API & SMPP integration support.',
      'Template management and campaign scheduling.',
      'Secure and reliable platform.',
      'Technical assistance is available during the integration process.',
    ],
  },
  'Outbound Voice Calling (OBD)': {
    rate: 0.095,
    count: 50000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'OBD',
    heading: 'Outbound Dialer (OBD) Services',
    intro:
      'Immense Smart Solution delivers automated Outbound Dialer (OBD) solutions to broadcast personalized voice messages to thousands of customers simultaneously with high pickup rates.',
    rateLabel: 'Voice Rate 30 Sec-Pulse',
    bullets: [
      'Voice SMS will be delivered on both DND and Non-DND numbers.',
      'You will be charged only for answered calls with a 30-second pulse.',
      'Automated retry mechanism for unanswered calls.',
      'Real-time campaign analytics with call duration and status reports.',
      'Campaign Time: 09:00 AM to 09:00 PM.',
      'Voice approval TAT: 10 minutes.',
      'Voice Record TAT: 1 Day.',
      '24X7 Customer Care Support.',
      'Regular panel performance monitoring & tuning.',
      'Life time validity, 100% reliable services & reports.',
    ],
  },
  'Cloud IVR Solutions': {
    rate: 0.3,
    count: 30000,
    setupCharges: 5000,
    monthlyCharges: 2000,
    badge: 'IVR',
    heading: 'IVR Solutions & Pricing',
    intro:
      'Automate inbound customer journeys with a cloud IVR built for scale — multi-level menus, call routing, recording and real-time reporting on a virtual number of your choice.',
    rateLabel: 'IVR Rate',
    bullets: [
      'Multi-level IVR menu with smart call routing.',
      'Virtual number / toll-free number support.',
      'Call recording & downloadable reports.',
      'Sticky agent and working-hour routing.',
      'Missed call alerts over SMS & email.',
      'Real-time dashboard and live call monitoring.',
      'API & CRM integration support.',
    ],
  },
  'Missed Call Alert (MCA)': {
    rate: 0.015,
    count: 100000,
    setupCharges: 0,
    monthlyCharges: 0,
    badge: 'MCA',
    heading: 'Missed Call Alert (MCA) Services',
    intro:
      'Immense Smart Solution offers Missed Call Alert (MCA) services to help you capture leads, run polls, and verify users automatically with zero cost to the caller. Our automated missed call solution ensures instant responses and real-time data integration for better customer engagement.',
    rateLabel: 'MCA Rate',
    bullets: [
      'Instant Lead Capture: Auto-disconnect calls after 1-2 rings and trigger immediate SMS / WhatsApp response.',
      'Real-time Webhook & API: Instant notification push to CRM upon receiving missed call.',
      'Virtual Number Integration: Dedicated virtual landline or mobile numbers assigned for campaign tracking.',
      'Unlimited Capacity: Concurrent call handling with detailed analytics and caller location reporting.',
      'Easy Campaign Management: Create and manage missed call campaigns from a simple dashboard.',
      'Real-time Reports: Detailed logs with date, time, mobile number and location data.',
      'Wide Compatibility: Works across all telecom operators (Non-DND & DND numbers).',
      'No Cost to Caller: Absolutely free for your customers.',
      'Reliable & Scalable: High uptime engines to handle large volume campaigns.',
      '24x7 Support: Technical assistance and campaign monitoring.',
    ],
  },
  'Transactional Email': {
    rate: 0.05,
    count: 100000,
    setupCharges: 1000,
    monthlyCharges: 500,
    badge: 'EMAIL',
    heading: 'Enterprise Email Services',
    intro:
      'Immense Smart Solution offers high-deliverability enterprise email services for transactional alerts, invoices, notifications, and promotional marketing campaigns.',
    rateLabel: 'Email Rate',
    bullets: [
      'High inbox deliverability with IP reputation management.',
      'Custom domain authentication (SPF, DKIM, DMARC).',
      'SMTP & REST API integration support.',
      'Real-time open, click, bounce, and unsubscribe tracking.',
      'HTML template builder and responsive templates.',
      'Dedicated or shared IP pool options.',
      '24x7 Technical support and deliverability tuning.',
    ],
  },
  'SMPP Connectivity': {
    rate: 0.06,
    count: 500000,
    setupCharges: 10000,
    monthlyCharges: 5000,
    badge: 'SMPP',
    heading: 'SMPP Connectivity',
    intro:
      'High-throughput, carrier-grade SMPP connectivity for enterprises sending at volume — direct binds, low latency and guaranteed uptime with dedicated technical support.',
    rateLabel: 'SMPP Rate',
    bullets: [
      'SMPP v3.4 direct bind (TX / RX / TRX).',
      'Dedicated throughput as per committed TPS.',
      'IP whitelisting & secure credentials.',
      'Real-time DLR push over SMPP.',
      '99.5% platform uptime commitment.',
      'Dedicated NOC & technical integration support.',
    ],
  },
};

export const SERVICE_DEFAULTS: Record<string, { rate: number; count: number }> =
  Object.fromEntries(
    Object.entries(SERVICE_TEMPLATES).map(([k, v]) => [
      k,
      { rate: v.rate, count: v.count },
    ])
  );

export function createInitialQuotationFromLead(
  lead: Lead,
  overrideItems?: ServicePriceItem[],
  overrideChannel?: string,
  managerOverride?: {
    name?: string;
    designation?: string;
    phone?: string;
    email?: string;
  }
): LeadQuotation {
  const sourceItems: ServicePriceItem[] =
    overrideItems && overrideItems.length > 0
      ? overrideItems
      : lead.serviceItems && lead.serviceItems.length > 0
      ? lead.serviceItems
      : (lead.selectedServices && lead.selectedServices.length > 0
          ? lead.selectedServices
          : ['Bulk SMS (DLT)']
        ).map((svc) => {
          const tpl = SERVICE_TEMPLATES[svc];
          return {
            service: svc,
            rate: tpl?.rate ?? 0.0675,
            count: tpl?.count ?? 100000,
            amount: (tpl?.rate ?? 0.0675) * (tpl?.count ?? 100000),
            setupCharges: tpl?.setupCharges ?? 0,
            monthlyCharges: tpl?.monthlyCharges ?? 0,
            bullets: tpl?.bullets ?? [],
          };
        });

  const subtotal = sourceItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const gstPercent = 18;
  const gstAmount = Number(((subtotal * gstPercent) / 100).toFixed(2));
  const totalAmount = subtotal + gstAmount;

  return {
    quotationNumber: `ISS/2026/${String(Math.floor(Math.random() * 900) + 100)}`,
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    clientName: lead.clientName || 'Darshan Pingat',
    companyName: lead.companyName || 'Nirman Greens',
    phone: lead.phone || '+919665541193',
    email: lead.email || 'NirmanGreens@gmail.com',
    items: sourceItems,
    subtotal,
    gstPercent,
    gstAmount,
    totalAmount,
    channel: overrideChannel || lead.quotationChannel || lead.serviceInterest || 'Bulk SMS (DLT)',
    termsNotes:
      'Payment terms: 100% advance. Rates exclusive of GST. Validity: 15 days.',
    managerName: managerOverride?.name || 'Rushikesh Limje',
    managerDesignation: managerOverride?.designation || 'Sales & Marketing Manager',
    managerPhone: managerOverride?.phone || '+91 9768566466',
    managerEmail: managerOverride?.email || 'sales@immenseair.in',
    updatedAt: new Date().toISOString(),
  };
}

// Map service names to product keys
const SERVICE_TO_KEY: Record<string, string> = {
  'Bulk SMS (DLT)': 'bulkSms',
  'RCS Messaging': 'rcs',
  'WhatsApp Business API': 'metaWhatsapp',
  'Virtual WhatsApp': 'virtualWhatsapp',
  'CPaaS Omni Communication': 'cpaas',
  'Outbound Voice Calling (OBD)': 'obd',
  'Cloud IVR Solutions': 'ivr',
  'Missed Call Alert (MCA)': 'mca',
  'Transactional Email': 'email',
  'SMPP Connectivity': 'smpp',
};

// ========================================================
// Main Quotation App / Modal matching quotation-secure-app
// ========================================================
function makeFreshProposalNumber(): string {
  return `ISS/${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`;
}

export function QuotationModal({
  open,
  onClose,
  lead,
  initialQuotation,
  onSave,
  onOpenEmailComposer,
  onSendWhatsApp,
  quotationHistory,
  managerDefaults,
}: {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  initialQuotation: LeadQuotation | null;
  startInEdit?: boolean;
  onSave: (quotation: LeadQuotation) => Promise<void> | void;
  onOpenEmailComposer?: (quotation: LeadQuotation) => Promise<void> | void;
  onSendWhatsApp?: (quotation: LeadQuotation) => Promise<void> | void;
  quotationHistory?: LeadQuotation[];
  managerDefaults?: {
    name?: string;
    designation?: string;
    phone?: string;
    email?: string;
  };
}) {
  const [data, setData] = useState<QuotationState>(getDefaultQuotationState);
  const [openProductKey, setOpenProductKey] = useState<string | null>('cpaas');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<number | 'fit-width' | 'fit-page'>(
    'fit-width'
  );
  const [scale, setScale] = useState<number>(1);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const highlightTimeout = useRef<NodeJS.Timeout | null>(null);

  const buildQuotationEditorState = (qt: LeadQuotation | null): QuotationState => {
    const initial = getDefaultQuotationState();

    if (lead) {
      initial.client.clientName = lead.clientName || 'Client Name';
      initial.client.companyName = lead.companyName || 'Company Name';
      initial.client.date = new Date().toLocaleDateString('en-GB');
    }

    if (managerDefaults) {
      if (managerDefaults.name) initial.manager.name = managerDefaults.name;
      if (managerDefaults.designation) initial.manager.designation = managerDefaults.designation;
      if (managerDefaults.phone) initial.manager.mobile = managerDefaults.phone;
      if (managerDefaults.email) initial.manager.email = managerDefaults.email;
    }

    if (qt) {
      initial.client.clientName = qt.clientName || initial.client.clientName;
      initial.client.companyName = qt.companyName || initial.client.companyName;
      initial.client.proposalNumber = qt.quotationNumber || initial.client.proposalNumber;
      initial.client.date = qt.quotationDate || initial.client.date;

      if (qt.managerName) initial.manager.name = qt.managerName;
      if (qt.managerDesignation) initial.manager.designation = qt.managerDesignation;
      if (qt.managerPhone) initial.manager.mobile = qt.managerPhone;
      if (qt.managerEmail) initial.manager.email = qt.managerEmail;

      if (qt.items && qt.items.length > 0) {
        const enabledKeys = new Set(qt.items.map((it) => SERVICE_TO_KEY[it.service] || ''));
        initial.products = initial.products.map((p) => {
          const matchItem = qt.items.find((it) => SERVICE_TO_KEY[it.service] === p.key);
          if (matchItem) {
            return {
              ...p,
              enabled: true,
              tables: p.tables.map((t, idx) =>
                idx === 0
                  ? {
                      ...t,
                      rateValue: String(matchItem.rate),
                    }
                  : t
              ),
              pricing: {
                ...p.pricing,
                setup: String(matchItem.setupCharges || 0),
                monthly: String(matchItem.monthlyCharges || 0),
                price: String(matchItem.amount || 0),
              },
            };
          }
          return {
            ...p,
            enabled: enabledKeys.has(p.key),
          };
        });
      }
    } else {
      initial.client.proposalNumber = makeFreshProposalNumber();
    }

    return initial;
  };

  const loadQuotationIntoState = (qt: LeadQuotation) => {
    setData(buildQuotationEditorState(qt));
  };

  // Sync initial state from Lead or existing quotation
  useEffect(() => {
    if (!open) return;
    setData(buildQuotationEditorState(initialQuotation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead, initialQuotation]);

  // Handle Zoom Fit Width & Fit Page
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateScale = () => {
      if (typeof zoomMode === 'number') {
        setScale(zoomMode);
        return;
      }
      const scaleW = (scroller.clientWidth - 48) / PAGE_WIDTH_PX;
      if (zoomMode === 'fit-width') {
        setScale(Math.min(1.5, Math.max(0.2, scaleW)));
        return;
      }
      const scaleH = (scroller.clientHeight - 48) / PAGE_HEIGHT_PX;
      setScale(Math.min(1.5, Math.max(0.2, Math.min(scaleW, scaleH))));
    };

    updateScale();
    const obs = new ResizeObserver(updateScale);
    obs.observe(scroller);
    return () => obs.disconnect();
  }, [zoomMode]);

  // Focus & Scroll Preview to clicked item
  const scrollPreviewToElement = useCallback((targetEl: HTMLElement) => {
    const scroller = scrollerRef.current;
    if (!targetEl || !scroller) return;
    const topDiff =
      targetEl.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      scroller.clientHeight / 2 +
      targetEl.getBoundingClientRect().height / 2;
    scroller.scrollTo({
      top: Math.max(0, topDiff),
      behavior: 'smooth',
    });
  }, []);

  const triggerPreviewFocus = useCallback(
    (focusId: string) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const targetEl = scroller.querySelector<HTMLElement>(
        `[data-focus="${focusId}"]`
      );
      if (targetEl) {
        scrollPreviewToElement(targetEl);
        setHighlight(focusId);
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlight(null), 2000);
      }
    },
    [scrollPreviewToElement]
  );

  const scrollToPage = useCallback((pageId: string) => {
    const scroller = scrollerRef.current;
    const pageEl = scroller?.querySelector<HTMLElement>(`#page-${pageId}`);
    if (!scroller || !pageEl) return;
    const top =
      pageEl.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    scroller.scrollTo({
      top: Math.max(0, top - 12),
      behavior: 'smooth',
    });
  }, []);

  const handleSelectFromPreview = useCallback((focusId: string) => {
    const section = focusId.split(':')[0] || 'client';
    setActiveSection(section);
    if (
      section !== 'client' &&
      section !== 'manager' &&
      section !== 'contact'
    ) {
      setOpenProductKey(section);
    }
    const targetRef =
      sectionRefs.current[section === 'contact' ? 'manager' : section] ||
      sectionRefs.current.client;
    targetRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setActiveSection(null), 2000);
  }, []);

  // Update product helper
  const updateProduct = (key: string, patch: Partial<ProductItem>) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.key === key ? { ...p, ...patch } : p
      ),
    }));
  };

  const registerSection = (key: string) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const enabledProducts = data.products.filter((p) => p.enabled);
  const totalPages = enabledProducts.length + 2;

  const grandTotal = useMemo(() => {
    return enabledProducts.reduce((sum, p) => {
      const totalNum = Number(p.pricing.total);
      return sum + (totalNum > 0 ? totalNum : computeProductTotal(p.pricing));
    }, 0);
  }, [enabledProducts]);

  const navItems = useMemo(
    () => [
      { id: 'cover', label: 'Cover' },
      ...enabledProducts.map((p) => ({
        id: p.key,
        label: PRODUCT_NAMES[p.key] || p.title,
      })),
      { id: 'contact', label: 'Terms & Contact' },
    ],
    [enabledProducts]
  );

  const buildCurrentQuotation = (): LeadQuotation => {
    const KEY_TO_SVC: Record<string, string> = Object.fromEntries(
      Object.entries(SERVICE_TO_KEY).map(([k, v]) => [v, k])
    );

    const items: ServicePriceItem[] = enabledProducts.map((p) => {
      const firstRate = Number(p.tables[0]?.rateValue) || 0.1;
      const setup = parseNumber(p.pricing.setup);
      const monthly = parseNumber(p.pricing.monthly);
      const lineTotal = computeProductTotal(p.pricing);
      return {
        service: KEY_TO_SVC[p.key] || p.title,
        rate: firstRate,
        count: 100000,
        amount: lineTotal,
        setupCharges: setup,
        monthlyCharges: monthly,
        bullets: p.bullets,
      };
    });

    const subtotal = grandTotal / 1.18;
    const gstAmount = grandTotal - subtotal;

    return {
      quotationNumber: data.client.proposalNumber || makeFreshProposalNumber(),
      quotationDate: data.client.date || new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      clientName: data.client.clientName,
      companyName: data.client.companyName,
      phone: lead?.phone || '',
      email: lead?.email || '',
      items,
      subtotal: Number(subtotal.toFixed(2)),
      gstPercent: 18,
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount: Number(grandTotal.toFixed(2)),
      channel: items[0]?.service || 'Bulk SMS (DLT)',
      termsNotes: 'Payment Terms is postpaid. Rates are non-negotiable.',
      managerName: data.manager.name,
      managerDesignation: data.manager.designation,
      managerPhone: data.manager.mobile,
      managerEmail: data.manager.email,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSaveToLead = async () => {
    await onSave(buildCurrentQuotation());
    onClose();
  };

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailAttachPdf, setEmailAttachPdf] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const openEmailModal = async () => {
    const currentQt = buildCurrentQuotation();

    if (onOpenEmailComposer) {
      await onOpenEmailComposer(currentQt);
      return;
    }

    const toEmail = lead?.email || '';
    const ccEmail = [data.manager.email || 'sales@immenseair.in', 'vikram.admin@nexuscrm.in'].filter(Boolean).join(',');
    const subject = `Business Proposal & Quotation ${currentQt.quotationNumber} — Immense Air Pvt Ltd`;
    const servicesList = enabledProducts
      .map((p) => {
        const lineTotal = computeProductTotal(p.pricing);
        return `• ${PRODUCT_NAMES[p.key] || p.title} — ₹ ${lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      })
      .join('\n');
    const textBody = `Dear ${data.client.clientName || 'Partner'},\n\nGreetings from Immense Air Pvt Ltd (Immense Smart Solution)!\n\nWe are pleased to present our communication solutions proposal for ${data.client.companyName || 'your esteemed business'}.\n\nProposal Details:\nProposal No: ${currentQt.quotationNumber}\nDate: ${currentQt.quotationDate}\nValid Until: ${currentQt.validUntil}\nSelected Services:\n${servicesList}\nGrand Total: ₹ ${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (inclusive of 18% GST)\n\nPlease review the proposal and let us know if you need any clarification or customization.\n\nWarm regards,\n${data.manager.name}\n${data.manager.designation}\nImmense Air Pvt Ltd\nMobile: ${data.manager.mobile}\nEmail: ${data.manager.email}\nWebsite: www.immenseair.in`;

    const hostingerUrl =
      `https://mail.hostinger.com/?_task=mail&_action=compose` +
      `&_to=${encodeURIComponent(toEmail)}` +
      `&_cc=${encodeURIComponent(ccEmail)}` +
      `&_subject=${encodeURIComponent(subject)}` +
      `&_body=${encodeURIComponent(textBody)}`;
    window.open(hostingerUrl, 'immense_hostinger_mail');
  };

  const handleSendEmail = async () => {
    const toEmail = emailTo.trim();
    const ccEmail = emailCc.trim();
    const subject = emailSubject.trim();
    const textBody = emailBody;

    const formattedMessageHtml = textBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #33405a; line-height: 1.6; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f2a5f; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; color: #ffffff; font-size: 20px;">IMMENSE AIR PVT LTD</h2>
          <div style="color: #f2591f; font-weight: bold; font-size: 13px; margin-top: 4px;">Smart Communication. Stronger Results.</div>
        </div>
        <div style="padding: 24px;">
          <div style="font-size: 14px; line-height: 1.7; color: #1e293b;">
            ${formattedMessageHtml}
          </div>
        </div>
      </div>
    `;

    setSendingEmail(true);
    setEmailStatusMessage(null);

    try {
      // Generate real 100% exact design A4 PDF Base64
      let pdfBase64: string | undefined = undefined;
      let pdfFilename: string | undefined = undefined;
      if (emailAttachPdf) {
        try {
          const root = document.getElementById('print-root');
          if (root) {
            const { base64 } = await captureExactQuotationHtmlPdf(root);
            pdfBase64 = base64;
          } else {
            const KEY_TO_SVC: Record<string, string> = Object.fromEntries(
              Object.entries(SERVICE_TO_KEY).map(([k, v]) => [v, k])
            );
            const mappedItems: ServicePriceItem[] = enabledProducts.map((p) => {
              const firstRate = Number(p.tables[0]?.rateValue) || 0.1;
              const setup = parseNumber(p.pricing.setup);
              const monthly = parseNumber(p.pricing.monthly);
              const lineTotal = computeProductTotal(p.pricing);
              return {
                service: KEY_TO_SVC[p.key] || p.title,
                rate: firstRate,
                count: 100000,
                amount: lineTotal,
                setupCharges: setup,
                monthlyCharges: monthly,
                bullets: p.bullets,
              };
            });

            const subtotalCalc = Number((grandTotal / 1.18).toFixed(2));
            const gstAmountCalc = Number((grandTotal - subtotalCalc).toFixed(2));
            const quotationForPdf: LeadQuotation = {
              quotationNumber: data.client.proposalNumber || 'ISS/2026/001',
              quotationDate: data.client.date || new Date().toISOString().slice(0, 10),
              validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
              clientName: data.client.clientName,
              companyName: data.client.companyName,
              phone: lead?.phone || '',
              email: toEmail,
              channel: mappedItems[0]?.service || 'Bulk SMS (DLT)',
              items: mappedItems,
              subtotal: subtotalCalc,
              gstPercent: 18,
              gstAmount: gstAmountCalc,
              totalAmount: Number(grandTotal.toFixed(2)),
              termsNotes: 'Payment terms: 100% advance or as mutually agreed. Validity: 15 days.',
              managerName: data.manager.name,
              managerDesignation: data.manager.designation,
              managerPhone: data.manager.mobile,
              managerEmail: data.manager.email,
              updatedAt: new Date().toISOString(),
            };
            const { base64 } = generateQuotationPdfBlob(quotationForPdf);
            pdfBase64 = base64;
          }
          pdfFilename = `Proposal_${(data.client.proposalNumber || 'Proposal').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
        }
      }

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          cc: ccEmail,
          subject,
          text: textBody,
          html: htmlBody,
          proposalNumber: data.client.proposalNumber,
          clientName: data.client.clientName,
          companyName: data.client.companyName,
          pdfBase64,
          pdfFilename,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setEmailStatusMessage({
          type: 'success',
          text: `Email successfully sent to ${toEmail} with PDF Quotation!`,
        });
        setEmailModalOpen(false);
      } else {
        const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;
        window.open(mailtoUrl, '_blank');
        setEmailModalOpen(false);
      }
    } catch {
      const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;
      window.open(mailtoUrl, '_blank');
      setEmailModalOpen(false);
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailStatusMessage(null), 6000);
    }
  };

  const handleSendWhatsApp = async () => {
    const currentQt = buildCurrentQuotation();
    let cleanPhone = (lead?.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const servicesList = enabledProducts
      .map((p) => {
        const lineTotal = computeProductTotal(p.pricing);
        return `• *${PRODUCT_NAMES[p.key] || p.title}* — ₹ ${lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      })
      .join('\n');
    const message = `Hello *${data.client.clientName || 'Sir/Madam'}*,\n\nGreetings from *Immense Air Pvt Ltd*!\n\nHere is your official *Business Proposal*:\n📄 *Proposal No:* ${currentQt.quotationNumber}\n📅 *Date:* ${currentQt.quotationDate}\n⏳ *Valid Until:* ${currentQt.validUntil}\n🏢 *Company:* ${data.client.companyName}\n\n*Services & Pricing:*\n${servicesList}\n\n💰 *Grand Total:* ₹ ${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (incl. 18% GST)\n\nFor any queries, feel free to reach out to:\n👤 *${data.manager.name}* (${data.manager.designation})\n📞 ${data.manager.mobile} | ✉️ ${data.manager.email}\n\nThank you for choosing Immense Air!`;

    const waUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, 'immense_whatsapp_web');

    if (onSendWhatsApp) {
      await onSendWhatsApp(currentQt);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-0 md:p-3">
      <div className="relative w-full max-w-[1600px] bg-brand-grey min-h-screen md:min-h-0 md:rounded-2xl shadow-2xl flex flex-col border border-brand-line overflow-hidden">
        {/* Top Header matching quotation-secure-app */}
        <header className="no-print sticky top-0 z-30 border-b border-brand-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white shadow-sm">
                IS
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold leading-tight text-navy">
                  Immense Smart Solution
                </h1>
                <p className="truncate text-xs text-brand-ink/60">
                  Proposal {data.client.proposalNumber} • {data.client.companyName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-brand-ink/60">
                  {enabledProducts.length} products · {totalPages} pages
                </p>
                <p className="text-sm font-semibold text-navy">
                  Grand Total ₹ {grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>

              {quotationHistory && quotationHistory.length > 0 && (
                <select
                  aria-label="Past Quotes"
                  value={
                    quotationHistory.some((q) => q.quotationNumber === data.client.proposalNumber)
                      ? data.client.proposalNumber
                      : ''
                  }
                  onChange={(e) => {
                    const found = quotationHistory.find(
                      (q) => q.quotationNumber === e.target.value
                    );
                    if (found) loadQuotationIntoState(found);
                  }}
                  className="rounded-lg border border-brand-line bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer max-w-[190px]"
                  title="Load a previously sent quotation"
                >
                  <option value="">Past Quotes ({quotationHistory.length})</option>
                  {quotationHistory.map((q) => (
                    <option key={q.quotationNumber} value={q.quotationNumber}>
                      {q.quotationNumber} • {q.quotationDate} • ₹{Number(q.totalAmount || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => {
                  const freshNo = makeFreshProposalNumber();
                  const todayStr = new Date().toLocaleDateString('en-GB');
                  setData((prev) => ({
                    ...prev,
                    client: {
                      ...prev.client,
                      proposalNumber: freshNo,
                      date: todayStr,
                    },
                  }));
                }}
                className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-800 transition-all cursor-pointer"
                title="Assign a brand-new proposal number to send another revision"
              >
                + New Quote
              </button>

              <button
                type="button"
                onClick={async () => {
                  const filename = `Proposal_${(data.client.proposalNumber || 'Proposal').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                  const root = document.getElementById('print-root');
                  if (root) {
                    try {
                      const { blob } = await captureExactQuotationHtmlPdf(root);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      return;
                    } catch (canvasErr) {
                      console.warn('captureExactQuotationHtmlPdf failed, trying fallback vector PDF:', canvasErr);
                    }
                  }

                  // Fallback: Generate vector PDF from current data
                  try {
                    const KEY_TO_SVC: Record<string, string> = Object.fromEntries(
                      Object.entries(SERVICE_TO_KEY).map(([k, v]) => [v, k])
                    );
                    const items: ServicePriceItem[] = enabledProducts.map((p) => {
                      const firstRate = Number(p.tables[0]?.rateValue) || 0.1;
                      const setup = parseNumber(p.pricing.setup);
                      const monthly = parseNumber(p.pricing.monthly);
                      const lineTotal = computeProductTotal(p.pricing);
                      return {
                        service: KEY_TO_SVC[p.key] || p.title,
                        rate: firstRate,
                        count: 100000,
                        amount: lineTotal,
                        setupCharges: setup,
                        monthlyCharges: monthly,
                        bullets: p.bullets,
                      };
                    });

                    const subtotalCalc = Number((grandTotal / 1.18).toFixed(2));
                    const gstAmountCalc = Number((grandTotal - subtotalCalc).toFixed(2));
                    const fallbackQt: LeadQuotation = {
                      quotationNumber: data.client.proposalNumber || 'ISS/2026/001',
                      quotationDate: data.client.date || new Date().toISOString().slice(0, 10),
                      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                      clientName: data.client.clientName,
                      companyName: data.client.companyName,
                      phone: lead?.phone || '',
                      email: lead?.email || '',
                      channel: items[0]?.service || 'Bulk SMS (DLT)',
                      items,
                      subtotal: subtotalCalc,
                      gstPercent: 18,
                      gstAmount: gstAmountCalc,
                      totalAmount: Number(grandTotal.toFixed(2)),
                      termsNotes: 'Payment terms: 100% advance or as mutually agreed. Validity: 15 days.',
                      managerName: data.manager.name,
                      managerDesignation: data.manager.designation,
                      managerPhone: data.manager.mobile,
                      managerEmail: data.manager.email,
                      updatedAt: new Date().toISOString(),
                    };

                    const { blob } = generateQuotationPdfBlob(fallbackQt);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    window.print();
                  }
                }}
                className="rounded-lg bg-[#0f2a5f] hover:bg-[#0a1b3f] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-panel transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                title="Download 100% exact live A4 proposal design as PDF"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Exact A4 PDF
              </button>

              <button
                type="button"
                onClick={openEmailModal}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-panel transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                title="Send quotation via Hostinger Webmail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                Send on Mail
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-panel transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                title="Send quotation directly on WhatsApp Web"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Send on WhatsApp
              </button>

              <button
                type="button"
                onClick={handleSaveToLead}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-panel transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-ink/70 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {emailStatusMessage && (
            <div
              className={`px-5 py-2 text-xs font-medium border-t flex items-center justify-between ${
                emailStatusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : emailStatusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              <span>{emailStatusMessage.text}</span>
              <button
                type="button"
                onClick={() => setEmailStatusMessage(null)}
                className="text-xs font-bold px-1.5 py-0.5 opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}
        </header>

        {/* Two-Column Layout (Left Form Editor, Right Live A4 Preview) */}
        <div className="print-area-wrapper mx-auto grid w-full max-w-[1600px] flex-1 items-start gap-6 px-4 py-5 lg:grid-cols-[440px_minmax(0,1fr)]">
          {/* Left Column: Form Editor */}
          <div className="no-print space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
            {/* 1. Client Information */}
            <SectionPanel
              title="Client Information"
              subtitle="Appears on the proposal cover page"
              innerRef={registerSection('client')}
              active={activeSection === 'client'}
              right={
                <PreviewEyeButton
                  title="Preview cover page"
                  onClick={() => triggerPreviewFocus('client:name')}
                />
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Client Name"
                  value={data.client.clientName}
                  onFocusPreview={() => triggerPreviewFocus('client:name')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      client: { ...prev.client, clientName: val },
                    }))
                  }
                />
                <FormInput
                  label="Company Name"
                  value={data.client.companyName}
                  onFocusPreview={() => triggerPreviewFocus('client:company')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      client: { ...prev.client, companyName: val },
                    }))
                  }
                />
                <FormInput
                  label="Proposal Number"
                  value={data.client.proposalNumber}
                  onFocusPreview={() => triggerPreviewFocus('client:proposal')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      client: { ...prev.client, proposalNumber: val },
                    }))
                  }
                />
                <FormInput
                  label="Date"
                  value={data.client.date}
                  onFocusPreview={() => triggerPreviewFocus('client:date')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      client: { ...prev.client, date: val },
                    }))
                  }
                />
              </div>
            </SectionPanel>

            {/* 2. Product Pages Accordion */}
            <SectionPanel
              title="Product Pages"
              subtitle="Only enabled products are included in the PDF"
            >
              <div className="space-y-2.5">
                {data.products.map((p) => {
                  const isOpen = openProductKey === p.key;
                  return (
                    <div
                      key={p.key}
                      ref={registerSection(p.key)}
                      className={`scroll-mt-24 overflow-hidden rounded-xl border transition-colors ${
                        activeSection === p.key
                          ? 'border-navy ring-4 ring-navy/10'
                          : p.enabled
                          ? 'border-navy/25 bg-navy/[0.03]'
                          : 'border-brand-line bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <ToggleSwitch
                          on={p.enabled}
                          onChange={(val) => updateProduct(p.key, { enabled: val })}
                        />
                        <button
                          type="button"
                          onClick={() => setOpenProductKey(isOpen ? null : p.key)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span className="block truncate text-sm font-semibold text-navy">
                            {PRODUCT_NAMES[p.key] || p.title}
                          </span>
                          <span className="block text-xs text-brand-ink/55">
                            {p.enabled ? 'Included in PDF' : 'Excluded from PDF'}
                          </span>
                        </button>
                        {p.enabled && (
                          <PreviewEyeButton
                            title={`Preview ${PRODUCT_NAMES[p.key] || p.title}`}
                            onClick={() => scrollToPage(p.key)}
                          />
                        )}
                        <span
                          className={`text-brand-ink/40 transition-transform duration-300 text-xs ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </div>

                      {isOpen && (
                        <div className="space-y-3 border-t border-brand-line/70 px-4 py-4 bg-white">
                          <FormInput
                            label="Page Title"
                            value={p.title}
                            onFocusPreview={() => triggerPreviewFocus(`${p.key}:title`)}
                            onChange={(val) => updateProduct(p.key, { title: val })}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormInput
                              label="Badge Icon Label"
                              value={p.badge}
                              onFocusPreview={() => triggerPreviewFocus(`${p.key}:sub`)}
                              onChange={(val) => updateProduct(p.key, { badge: val })}
                            />
                            <FormInput
                              label="Section Heading"
                              value={p.subTitle}
                              onFocusPreview={() => triggerPreviewFocus(`${p.key}:sub`)}
                              onChange={(val) => updateProduct(p.key, { subTitle: val })}
                            />
                          </div>

                          <label className="block">
                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
                              Intro Description
                            </span>
                            <textarea
                              rows={3}
                              value={p.intro}
                              onFocus={() => triggerPreviewFocus(`${p.key}:intro`)}
                              onChange={(e) => {
                                updateProduct(p.key, { intro: e.target.value });
                                triggerPreviewFocus(`${p.key}:intro`);
                              }}
                              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                            />
                          </label>

                          {/* Table Blocks & Headers */}
                          <div className="rounded-lg border border-brand-line/70 bg-white p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
                                Table Blocks &amp; Headers
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  updateProduct(p.key, {
                                    tables: [
                                      ...p.tables,
                                      {
                                        slabLabel: 'Credit Slab',
                                        slabValue: 'Per Unit',
                                        rateLabel: 'Rate',
                                        rateValue: '0.00',
                                      },
                                    ],
                                  })
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline cursor-pointer"
                              >
                                + Add Table Block
                              </button>
                            </div>

                            <div className="space-y-3">
                              {p.tables.map((tbl, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="rounded-lg border border-brand-line/70 bg-brand-grey/40 p-3 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between border-b border-brand-line/50 pb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-navy">
                                      Table Block {tIdx + 1}
                                    </span>
                                    {p.tables.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateProduct(p.key, {
                                            tables: p.tables.filter((_, i) => i !== tIdx),
                                          })
                                        }
                                        className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                                      >
                                        ✕ Remove Table
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="mb-1 block text-[10px] font-semibold uppercase text-brand-ink/60">
                                        Left Header
                                      </span>
                                      <input
                                        type="text"
                                        value={tbl.slabLabel}
                                        onFocus={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                        onChange={(e) =>
                                          updateProduct(p.key, {
                                            tables: p.tables.map((t, idx) =>
                                              idx === tIdx
                                                ? { ...t, slabLabel: e.target.value }
                                                : t
                                            ),
                                          })
                                        }
                                        className="w-full rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs text-navy outline-none focus:border-navy"
                                      />
                                    </div>
                                    <div>
                                      <span className="mb-1 block text-[10px] font-semibold uppercase text-brand-ink/60">
                                        Right Header
                                      </span>
                                      <input
                                        type="text"
                                        value={tbl.rateLabel}
                                        onFocus={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                        onChange={(e) =>
                                          updateProduct(p.key, {
                                            tables: p.tables.map((t, idx) =>
                                              idx === tIdx
                                                ? { ...t, rateLabel: e.target.value }
                                                : t
                                            ),
                                          })
                                        }
                                        className="w-full rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs text-navy outline-none focus:border-navy"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="mb-1 block text-[10px] font-semibold uppercase text-brand-ink/60">
                                        Left Value (Slab)
                                      </span>
                                      <input
                                        type="text"
                                        value={tbl.slabValue}
                                        onFocus={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                        onChange={(e) =>
                                          updateProduct(p.key, {
                                            tables: p.tables.map((t, idx) =>
                                              idx === tIdx
                                                ? { ...t, slabValue: e.target.value }
                                                : t
                                            ),
                                          })
                                        }
                                        className="w-full rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy outline-none focus:border-navy"
                                      />
                                    </div>
                                    <div>
                                      <span className="mb-1 block text-[10px] font-semibold uppercase text-brand-ink/60">
                                        Right Value (Rate)
                                      </span>
                                      <input
                                        type="text"
                                        value={tbl.rateValue}
                                        onFocus={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                        onChange={(e) =>
                                          updateProduct(p.key, {
                                            tables: p.tables.map((t, idx) =>
                                              idx === tIdx
                                                ? { ...t, rateValue: e.target.value }
                                                : t
                                            ),
                                          })
                                        }
                                        className="w-full rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy outline-none focus:border-navy"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Agent Limit */}
                          <div className="rounded-lg border border-brand-line/70 bg-white p-3 space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
                              Total Agent Limit Section (Optional)
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <FormInput
                                label="Header Title"
                                value={p.agentLimitLabel ?? 'Total Agent Limit'}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, { agentLimitLabel: val })
                                }
                              />
                              <FormInput
                                label="Limit Value"
                                value={p.agentLimitValue ?? ''}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, { agentLimitValue: val })
                                }
                              />
                            </div>
                          </div>

                          {/* Pricing block */}
                          <div className="rounded-lg bg-white p-3 space-y-3 border border-brand-line/70">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
                              Summary Pricing Table (Setup, Monthly, Price, GST, Total)
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <FormInput
                                label="Setup Charges Value"
                                value={p.pricing.setup}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, {
                                    pricing: { ...p.pricing, setup: val },
                                  })
                                }
                              />
                              <FormInput
                                label="Monthly Charges Value"
                                value={p.pricing.monthly}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, {
                                    pricing: { ...p.pricing, monthly: val },
                                  })
                                }
                              />
                              <FormInput
                                label="Price Value"
                                value={p.pricing.price}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, {
                                    pricing: { ...p.pricing, price: val },
                                  })
                                }
                              />
                              <FormInput
                                label="GST (%) Value"
                                value={p.pricing.gst}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, {
                                    pricing: { ...p.pricing, gst: val },
                                  })
                                }
                              />
                              <FormInput
                                label="Final Total (0 = Auto)"
                                value={p.pricing.total}
                                onFocusPreview={() => triggerPreviewFocus(`${p.key}:pricing`)}
                                onChange={(val) =>
                                  updateProduct(p.key, {
                                    pricing: { ...p.pricing, total: val },
                                  })
                                }
                              />
                            </div>
                            <p className="mt-1 text-xs text-brand-ink/60">
                              Auto total: ₹{' '}
                              {computeProductTotal(p.pricing).toLocaleString(
                                'en-IN',
                                { maximumFractionDigits: 2 }
                              )}
                            </p>
                          </div>

                          {/* Bullets */}
                          <label className="block">
                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-ink/60">
                              Bullet Points (one per line)
                            </span>
                            <textarea
                              rows={6}
                              value={p.bullets.join('\n')}
                              onFocus={() => triggerPreviewFocus(`${p.key}:bullets`)}
                              onChange={(e) => {
                                updateProduct(p.key, {
                                  bullets: e.target.value.split('\n'),
                                });
                                triggerPreviewFocus(`${p.key}:bullets`);
                              }}
                              className="w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionPanel>

            {/* 3. Account Manager */}
            <SectionPanel
              title="Account Manager"
              subtitle="Shown on the final Contact Us page"
              innerRef={registerSection('manager')}
              active={activeSection === 'manager'}
              right={
                <PreviewEyeButton
                  title="Preview contact page"
                  onClick={() => triggerPreviewFocus('manager:card')}
                />
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Name"
                  value={data.manager.name}
                  onFocusPreview={() => triggerPreviewFocus('manager:card')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      manager: { ...prev.manager, name: val },
                    }))
                  }
                />
                <FormInput
                  label="Designation"
                  value={data.manager.designation}
                  onFocusPreview={() => triggerPreviewFocus('manager:card')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      manager: { ...prev.manager, designation: val },
                    }))
                  }
                />
                <FormInput
                  label="Mobile Number"
                  value={data.manager.mobile}
                  onFocusPreview={() => triggerPreviewFocus('manager:card')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      manager: { ...prev.manager, mobile: val },
                    }))
                  }
                />
                <FormInput
                  label="Email Address"
                  value={data.manager.email}
                  onFocusPreview={() => triggerPreviewFocus('manager:card')}
                  onChange={(val) =>
                    setData((prev) => ({
                      ...prev,
                      manager: { ...prev.manager, email: val },
                    }))
                  }
                />
              </div>
            </SectionPanel>
          </div>

          {/* Right Column: Live A4 Preview */}
          <div className="min-w-0 lg:sticky lg:top-[76px]">
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-navy">Live A4 Preview</h2>
              <div className="flex items-center gap-1.5">
                {[50, 75, 100].map((pct) => (
                  <ZoomButton
                    key={pct}
                    active={zoomMode === pct / 100}
                    onClick={() => setZoomMode(pct / 100)}
                  >
                    {pct}%
                  </ZoomButton>
                ))}
                <ZoomButton
                  active={zoomMode === 'fit-width'}
                  onClick={() => setZoomMode('fit-width')}
                >
                  Fit Width
                </ZoomButton>
                <ZoomButton
                  active={zoomMode === 'fit-page'}
                  onClick={() => setZoomMode('fit-page')}
                >
                  Fit Page
                </ZoomButton>
              </div>
            </div>

            <div className="relative">
              <div
                id="print-root"
                ref={scrollerRef}
                className="preview-scroller overflow-auto rounded-2xl bg-brand-grey lg:h-[calc(100vh-140px)] border border-brand-line"
              >
                <div
                  className="page-scaler flex flex-col items-center gap-6 py-3"
                  style={{ zoom: scale }}
                >
                  <FocusContext.Provider
                    value={{
                      highlight,
                      onSelect: handleSelectFromPreview,
                    }}
                  >
                    <CoverPage data={data} />
                    {enabledProducts.map((p) => (
                      <ServicePage key={p.key} product={p} />
                    ))}
                    <ContactPage data={data} />
                  </FocusContext.Provider>
                </div>
              </div>

              {/* Floating Page Navigation */}
              <nav className="no-print absolute right-3 top-3 max-h-[70%] w-[155px] overflow-auto rounded-xl border border-brand-line bg-white/95 p-1.5 shadow-panel backdrop-blur">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToPage(item.id)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-brand-ink/75 transition-colors hover:bg-navy/[0.07] hover:text-navy cursor-pointer"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 opacity-60"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
