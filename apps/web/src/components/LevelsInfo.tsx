import { ArrowDown, Award, CheckCircle2, Crown, HeartHandshake, Rocket, Sprout, Target, type LucideIcon } from "lucide-react";
import type { ClientLevel } from "@hogarplus/shared";
import { Modal } from "./Form";

type LevelStory = {
  level: Exclude<ClientLevel, "INICIAL">;
  name: string;
  accent: string;
  soft: string;
  icon: LucideIcon;
  tagline: string;
  intro: string[];
  meaning: string[];
  goal: string;
  goalNote: string;
};

const LEVELS: LevelStory[] = [
  {
    level: "BRONCE",
    name: "Bronce",
    accent: "#B87333",
    soft: "#F4E8DC",
    icon: Sprout,
    tagline: "¡Tu comienzo en HOGAR PLUS!",
    intro: [
      "Bronce es el primer paso de tu experiencia con nosotros.",
      "Es el nivel ideal para comenzar a construir tu historial y demostrar tu capacidad de pago.",
    ],
    meaning: [
      "Estás comenzando tu trayectoria con HOGAR PLUS.",
      "Puedes acceder a productos y compras dentro del límite asignado.",
      "Cada pago realizado a tiempo fortalece tu historial.",
      "Tu buen comportamiento te acerca al siguiente nivel.",
    ],
    goal: "¡Pasa de Bronce a Plata!",
    goalNote: "Cada compra y cada pago responsable cuentan.",
  },
  {
    level: "PLATA",
    name: "Plata",
    accent: "#8E9AA8",
    soft: "#E8ECF1",
    icon: Rocket,
    tagline: "¡Ya estás creciendo!",
    intro: [
      "Plata significa que has construido un historial con HOGAR PLUS y has demostrado un mejor comportamiento de pago.",
      "Es un nivel para clientes que están avanzando y pueden tener acceso a mayores oportunidades, de acuerdo con su capacidad y evaluación.",
    ],
    meaning: [
      "Has demostrado responsabilidad en tus pagos.",
      "Puedes acceder a productos de mayor valor, según tu capacidad.",
      "Tu historial te permite continuar aumentando tus oportunidades.",
      "Mantener tus pagos al día te acerca al nivel Oro.",
    ],
    goal: "¡Sigue avanzando hacia Oro!",
    goalNote: "Tu comportamiento de hoy puede abrirte nuevas oportunidades mañana.",
  },
  {
    level: "ORO",
    name: "Oro",
    accent: "#C4A04A",
    soft: "#F4EBD3",
    icon: Crown,
    tagline: "¡Eres un cliente preferencial!",
    intro: [
      "Oro representa el nivel más alto dentro del programa HOGAR PLUS.",
      "Es para clientes que han demostrado un excelente comportamiento de pago y una mayor capacidad de compra, de acuerdo con los criterios establecidos por HOGAR PLUS.",
    ],
    meaning: [
      "Has construido un historial sólido.",
      "Puedes acceder a oportunidades de compra de mayor valor, según evaluación.",
      "Puedes tener acceso a beneficios y condiciones especiales definidos por HOGAR PLUS.",
      "Tu buen comportamiento ayuda a mantener tu nivel.",
    ],
    goal: "¡Mantén tu nivel Oro!",
    goalNote: "Continúa pagando a tiempo y cuidando tu historial para conservar tus beneficios.",
  },
];

const PATH: Array<{ name: string; step: string; accent: string }> = [
  { name: "Bronce", step: "Comienza", accent: "#B87333" },
  { name: "Plata", step: "Crece", accent: "#8E9AA8" },
  { name: "Oro", step: "Disfruta mayores oportunidades", accent: "#C4A04A" },
];

export function LevelsInfoModal({ current, onClose }: { current?: ClientLevel; onClose: () => void }) {
  return (
    <Modal title="Tu nivel HOGAR PLUS" description="Cada cliente tiene la oportunidad de avanzar." onClose={onClose} size="lg">
      <div className="space-y-6 text-navy-900">
        <div className="rounded-2xl bg-navy-900 p-5 text-white">
          <div className="flex items-center gap-2 text-gold-300">
            <Award size={18} />
            <p className="text-sm font-semibold uppercase tracking-wider">Tu nivel Hogar Plus</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            En HOGAR PLUS, cada cliente tiene la oportunidad de avanzar. Tu nivel se determina tomando en cuenta tu
            historial de compras, capacidad de pago y comportamiento de pago.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Mientras mantengas un buen comportamiento y cumplas con tus compromisos, podrás avanzar de nivel y acceder a
            mayores oportunidades.
          </p>
          {current === "INICIAL" ? (
            <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-gold-100">
              Estás empezando: tu primera meta es llegar a Bronce.
            </p>
          ) : null}
        </div>

        {LEVELS.map((item) => {
          const Icon = item.icon;
          const isCurrent = current === item.level;
          return (
            <section
              key={item.level}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: isCurrent ? item.accent : "#e2e8f0", boxShadow: isCurrent ? `0 0 0 3px ${item.accent}33` : undefined }}
            >
              <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: item.soft }}>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: item.accent }}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-semibold">{item.name}</p>
                  <p className="text-sm font-medium text-slate-700">{item.tagline}</p>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: item.accent }}>
                    Tu nivel
                  </span>
                ) : null}
              </div>
              <div className="space-y-4 px-5 py-4">
                {item.intro.map((line) => (
                  <p key={line} className="text-sm leading-6 text-slate-600">{line}</p>
                ))}
                <div>
                  <p className="text-sm font-semibold">¿Qué significa estar en {item.name}?</p>
                  <ul className="mt-2 space-y-1.5">
                    {item.meaning.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <CheckCircle2 size={16} className="mt-1 shrink-0" style={{ color: item.accent }} />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Target size={18} className="mt-0.5 shrink-0" style={{ color: item.accent }} />
                  <div>
                    <p className="text-sm font-semibold">Tu meta: {item.goal}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{item.goalNote}</p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Tu camino con HOGAR PLUS</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            {PATH.map((item, index) => (
              <div key={item.name} className="flex w-full flex-col items-center gap-2">
                <div
                  className="w-full max-w-xs rounded-2xl px-4 py-3 text-center text-white shadow-sm"
                  style={{ backgroundColor: item.accent }}
                >
                  <p className="font-display text-lg font-semibold">{item.name}</p>
                  <p className="text-sm opacity-90">{item.step}</p>
                </div>
                {index < PATH.length - 1 ? <ArrowDown size={18} className="text-slate-400" /> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-5 text-white">
          <div className="flex items-center gap-2 text-gold-300">
            <HeartHandshake size={18} />
            <p className="text-sm font-semibold uppercase tracking-wider">Cada pago cuenta</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Tu nivel no es solamente una categoría. Es el reflejo de tu trayectoria con HOGAR PLUS.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold sm:grid-cols-4">
            {["Compra responsablemente", "Paga a tiempo", "Construye tu historial", "Avanza de nivel"].map((line) => (
              <p key={line} className="rounded-xl bg-white/10 px-3 py-2 text-center">{line}</p>
            ))}
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-gold-100">HOGAR PLUS</p>
          <p className="text-sm text-slate-200">Tu esfuerzo de hoy puede abrirte más oportunidades mañana.</p>
        </section>
      </div>
    </Modal>
  );
}
