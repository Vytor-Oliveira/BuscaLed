import { Lightbulb } from "lucide-react";

/**
 * Tela de espera da sessão. O cookie é httpOnly, então toda carga de página
 * passa por um /auth/me antes de decidir rota — e isso aparece.
 */
export function CarregandoSessao() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[60vh] place-items-center px-5"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid size-12 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent-500/25" />
          <span className="relative grid size-12 place-items-center rounded-full bg-brand-600 text-on-brand dark:text-[#07111c]">
            <Lightbulb aria-hidden className="size-6" />
          </span>
        </span>
        <p className="text-sm font-medium text-muted">Carregando…</p>
      </div>
    </div>
  );
}
