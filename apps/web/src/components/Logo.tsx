export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className={compact ? "h-9 w-9" : "h-12 w-12"}>
        <rect width="64" height="64" rx="14" fill="#0B1F4A" />
        <path
          d="M32 12 L52 28 V50 H12 V28 Z"
          fill="none"
          stroke="#D4A017"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M22 42 C22 36 27 33 32 33 C37 33 42 36 42 42"
          fill="none"
          stroke="#F5E6C8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="32" cy="26" r="4" fill="#D4A017" />
      </svg>
      {!compact && (
        <div>
          <p className="font-display text-xl leading-none text-gold-100">HogarPlus</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold-300">Tu hogar, nuestro compromiso</p>
        </div>
      )}
    </div>
  );
}
