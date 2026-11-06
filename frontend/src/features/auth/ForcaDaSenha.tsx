import { useMemo } from "react";
import { cn } from "../../lib/cn";

const NIVEIS = [
  { rotulo: "Muito curta", classe: "bg-danger" },
  { rotulo: "Fraca", classe: "bg-danger" },
  { rotulo: "Razoável", classe: "bg-warning" },
  { rotulo: "Boa", classe: "bg-success" },
  { rotulo: "Forte", classe: "bg-success" },
] as const;

/**
 * Pontua a senha sem biblioteca: o backend exige 8 caracteres, e o resto é
 * orientação honesta, não bloqueio.
 */
function pontuar(senha: string): number {
  if (senha.length === 0) {
    return -1;
  }
  if (senha.length < 8) {
    return 0;
  }
  let pontos = 1;
  if (senha.length >= 12) {
    pontos += 1;
  }
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) {
    pontos += 1;
  }
  if (/\d/.test(senha) && /[^\w\s]/.test(senha)) {
    pontos += 1;
  }
  return Math.min(pontos, NIVEIS.length - 1);
}

export function ForcaDaSenha({ senha }: { senha: string }) {
  const nivel = useMemo(() => pontuar(senha), [senha]);

  if (nivel < 0) {
    return null;
  }

  const { rotulo, classe } = NIVEIS[nivel];

  return (
    <div className="mt-1">
      <div aria-hidden className="flex gap-1">
        {NIVEIS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-[var(--dur-fast)]",
              i <= nivel ? classe : "bg-line"
            )}
          />
        ))}
      </div>
      {/* aria-live para o leitor de tela acompanhar a mudança sem roubar o foco. */}
      <p aria-live="polite" className="mt-1.5 text-[12.5px] text-muted">
        Força da senha: <strong className="font-semibold text-ink">{rotulo}</strong>
        {nivel === 0 && " — o mínimo é 8 caracteres."}
      </p>
    </div>
  );
}
