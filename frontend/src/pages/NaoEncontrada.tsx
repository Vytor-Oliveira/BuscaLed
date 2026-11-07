import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";

export default function NaoEncontrada() {
  return (
    <>
      <SiteHeader />
      <main className="container-app grid min-h-[60vh] place-items-center py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <Compass aria-hidden className="size-7" />
          </span>
          <p data-numeros className="mt-5 text-[13px] font-bold tracking-widest text-subtle">
            ERRO 404
          </p>
          <h1 className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] font-bold tracking-[-0.025em] text-ink">
            Essa página não existe
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            O endereço pode ter mudado, ou o link que te trouxe aqui está
            desatualizado. A busca por veículo continua na página inicial.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-brand-600 px-5 text-sm font-semibold text-on-brand shadow-sm dark:text-[#07111c]"
          >
            Buscar meu veículo
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
