export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2F2545" />
      <path d="M9 8h7.5a8 8 0 0 1 0 16H9z" fill="none" stroke="#E3C68E" strokeWidth="3" />
      <circle cx="16.5" cy="16" r="2.5" fill="#B8A8F0" />
    </svg>
  );
}

export function Wordmark({ product }: { product?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[16px] font-semibold tracking-tight text-ink">Dechub</span>
        {product && <span className="mt-0.5 block text-[11.5px] text-orchid-hover">{product}</span>}
      </span>
    </span>
  );
}
