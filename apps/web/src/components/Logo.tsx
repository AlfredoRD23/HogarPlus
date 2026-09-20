export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className={compact ? "h-9 w-9" : "h-12 w-12"}>
        <rect width="64" height="64" rx="14" fill="#111827" />
        <path
          d="M32 12 L52 28 V50 H12 V28 Z"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M22 42 C22 36 27 33 32 33 C37 33 42 36 42 42"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="32" cy="26" r="4" fill="#e2e8f0" />
      </svg>
      {!compact && (
        <div>
          <p className="text-xl font-semibold leading-none text-slate-900">HogarPlus</p>
          <p className="mt-1 text-[11px] text-slate-500">Tu hogar, nuestro compromiso</p>
        </div>
      )}
    </div>
  );
}
