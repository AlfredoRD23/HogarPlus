import { useEffect, useRef, useState } from "react";

export function useOnceSubmit(saving?: boolean) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saving) {
      locked.current = false;
      setBusy(false);
    }
  }, [saving]);

  function guard(run: () => void) {
    if (locked.current || saving) return;
    locked.current = true;
    setBusy(true);
    run();
  }

  return { blocked: Boolean(saving || busy), guard };
}
