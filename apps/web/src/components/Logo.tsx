export function Logo({
  compact = false,
  light = false,
  name = "HogarPlus",
  city,
}: {
  compact?: boolean;
  light?: boolean;
  name?: string;
  city?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <svg viewBox="0 0 64 64" className={compact ? "h-9 w-9 shrink-0" : "h-9 w-9 shrink-0 sm:h-12 sm:w-12"}>
        <rect width="64" height="64" rx="14" fill="#1A2F52" />
        <path
          d="M32 12 L52 28 V50 H12 V28 Z"
          fill="none"
          stroke="#C4A04A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M22 42 C22 36 27 33 32 33 C37 33 42 36 42 42"
          fill="none"
          stroke="#F4EBD3"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="32" cy="26" r="4" fill="#C4A04A" />
      </svg>
      {!compact && (
        <div className="min-w-0">
          <p className={`truncate text-base font-semibold leading-none sm:text-xl ${light ? "text-navy-900" : "text-gold-100"}`}>{name}</p>
          <p className={`mt-1 hidden text-[11px] sm:block ${light ? "text-navy-700" : "text-gold-300"}`}>
            {city ?? "Tu hogar, nuestro compromiso"}
          </p>
        </div>
      )}
    </div>
  );
}
