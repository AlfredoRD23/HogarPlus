import { LoaderCircle } from "lucide-react";

export function Loader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin text-navy-800" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function WaitLabel({
  waiting,
  idle,
  busy = "Procesando...",
}: {
  waiting?: boolean;
  idle: string;
  busy?: string;
}) {
  if (!waiting) return idle;
  return (
    <>
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {busy}
    </>
  );
}
