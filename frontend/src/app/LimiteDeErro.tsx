import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface Estado {
  erro: Error | null;
}

/**
 * Error boundary da aplicação. Precisa ser classe: não existe equivalente em
 * hook para componentDidCatch.
 */
export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Falha não tratada na interface:", erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;

    if (!erro) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-bg text-danger">
            <TriangleAlert aria-hidden className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-ink">
            Algo quebrou nesta tela
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            O erro foi registrado no console do navegador. Recarregar costuma
            resolver; se insistir, volte para a página inicial.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-brand-600 px-4 text-sm font-semibold text-on-brand shadow-sm dark:text-[#07111c]"
            >
              <RotateCcw aria-hidden className="size-4" />
              Recarregar
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-sm"
            >
              Página inicial
            </a>
          </div>
        </div>
      </div>
    );
  }
}
