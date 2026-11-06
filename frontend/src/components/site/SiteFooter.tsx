import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Marca } from "./Marca";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-app flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Marca />
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            Motor de compatibilidade de iluminação automotiva LED. Catálogo e matriz de
            aplicação fornecidos pela Shocklight.
          </p>
          <p className="mt-4 inline-flex items-start gap-2 text-[12.5px] leading-snug text-muted">
            <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-success" />
            Sua placa nunca é armazenada em nenhuma etapa.
          </p>
        </div>

        <nav aria-label="Links do rodapé" className="flex flex-col gap-2.5 text-[13.5px]">
          <Link to="/garagem" className="text-muted hover:text-ink">
            Minha garagem
          </Link>
          <Link to="/pedidos" className="text-muted hover:text-ink">
            Meus pedidos
          </Link>
          <Link to="/entrar" className="text-muted hover:text-ink">
            Entrar ou criar conta
          </Link>
        </nav>

      </div>

      <div className="border-t border-line">
        <div className="container-app py-5 text-[12.5px] text-subtle">
          Projeto de portfólio — Engenharia de Software, Católica SC.
        </div>
      </div>
    </footer>
  );
}
