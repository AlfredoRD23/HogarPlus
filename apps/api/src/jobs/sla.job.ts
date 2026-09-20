import { applySla } from "../shared/sla";

const TEN_MINUTES = 10 * 60 * 1000;
let lastDayKey = "";
let timer: ReturnType<typeof setInterval> | undefined;

function santoDomingoDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

async function runSla(reason: string) {
  const result = await applySla();
  console.log(
    `SLA (${reason}): ${result.markedOverdue} cuota(s) pasaron a atrasadas · ${result.at}`,
  );
  return result;
}

export function startSlaCron() {
  if (timer) return;

  const tick = async (reason: string) => {
    const day = santoDomingoDayKey();
    if (reason !== "arranque" && day === lastDayKey) return;
    try {
      await runSla(reason);
      lastDayKey = day;
    } catch (error) {
      console.error("SLA diario falló", error);
    }
  };

  void tick("arranque");
  timer = setInterval(() => {
    void tick("diario");
  }, TEN_MINUTES);
}
