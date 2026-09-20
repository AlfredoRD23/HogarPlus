import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { mediaUrl } from "../lib/api";

export const IMAGE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif";
export const MAX_CLIENT_IMAGES = 8;
export const MAX_PRODUCT_IMAGES = 6;

export type SavedImage = { id: string; path: string };

export function ImagePicker({
  saved = [],
  pending,
  onAddFiles,
  onRemoveSaved,
  onRemovePending,
  label = "Fotos del cliente",
  hint,
  max = MAX_CLIENT_IMAGES,
}: {
  saved?: SavedImage[];
  pending: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveSaved?: (id: string) => void;
  onRemovePending: (index: number) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = saved.length + pending.length;
  const remaining = Math.max(0, max - total);

  return (
    <div>
      <p className="label">{label}</p>
      <p className="mb-2 text-xs text-slate-400">{hint ?? `Cédula, casa o el cliente. Máximo ${max} imágenes.`}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {saved.map((image) => (
          <div key={image.id} className="relative overflow-hidden rounded-xl bg-slate-100">
            <img src={mediaUrl(image.path)} alt="" className="h-24 w-full object-cover" />
            {onRemoveSaved ? (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-navy-950/80 p-1 text-white"
                onClick={() => onRemoveSaved(image.id)}
                aria-label="Quitar foto"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ))}
        {pending.map((file, index) => (
          <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl bg-slate-100">
            <img src={URL.createObjectURL(file)} alt="" className="h-24 w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-navy-950/80 p-1 text-white"
              onClick={() => onRemovePending(index)}
              aria-label="Quitar foto nueva"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={18} />
            <span className="mt-1 text-xs">Agregar</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []).slice(0, remaining);
          if (files.length) onAddFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
