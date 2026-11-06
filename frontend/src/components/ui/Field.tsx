import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";

const CONTROLE =
  "w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 text-ink " +
  "placeholder:text-subtle transition-[border-color,box-shadow] duration-[var(--dur-fast)] " +
  "ease-(--ease-out-expo) disabled:cursor-not-allowed disabled:bg-sunken disabled:text-subtle";

const NORMAL = "border-line-strong hover:border-[color-mix(in_oklab,var(--border-strong),var(--text)_22%)]";
const COM_ERRO = "border-danger";

interface BaseProps {
  rotulo: string;
  /** Texto de apoio permanente; some quando ha erro. */
  dica?: ReactNode;
  erro?: string;
  /** Some o rotulo visualmente mas mantem para leitor de tela. */
  rotuloOculto?: boolean;
  acessorio?: ReactNode;
}

function Envelope({
  id,
  rotulo,
  dica,
  erro,
  rotuloOculto,
  acessorio,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cn(
            "text-[13px] font-semibold text-ink",
            rotuloOculto && "sr-only"
          )}
        >
          {rotulo}
        </label>
        {acessorio}
      </div>
      {children}
      {erro ? (
        // aria-live para o leitor de tela anunciar o erro que aparece depois.
        <p id={`${id}-erro`} role="alert" className="text-[13px] font-medium text-danger">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={`${id}-dica`} className="text-[13px] text-muted">
            {dica}
          </p>
        )
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseProps {
  /** Icone a esquerda, ja renderizado. */
  prefixo?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { rotulo, dica, erro, rotuloOculto, acessorio, prefixo, className, id, ...resto },
  ref
) {
  const gerado = useId();
  const idCampo = id ?? gerado;

  return (
    <Envelope
      id={idCampo}
      rotulo={rotulo}
      dica={dica}
      erro={erro}
      rotuloOculto={rotuloOculto}
      acessorio={acessorio}
    >
      <div className="relative flex items-center">
        {prefixo && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 flex text-subtle"
          >
            {prefixo}
          </span>
        )}
        <input
          ref={ref}
          id={idCampo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${idCampo}-erro` : dica ? `${idCampo}-dica` : undefined}
          className={cn(
            CONTROLE,
            "h-11",
            erro ? COM_ERRO : NORMAL,
            prefixo && "pl-10",
            className
          )}
          {...resto}
        />
      </div>
    </Envelope>
  );
});

export interface SelectNativoProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    BaseProps {}

/**
 * Select nativo. Para lista curta e conhecida (ano, por exemplo) o nativo ganha
 * do customizado: ele usa o seletor do proprio sistema no celular.
 */
export const SelectNativo = forwardRef<HTMLSelectElement, SelectNativoProps>(
  function SelectNativo(
    { rotulo, dica, erro, rotuloOculto, acessorio, className, id, children, ...resto },
    ref
  ) {
    const gerado = useId();
    const idCampo = id ?? gerado;

    return (
      <Envelope
        id={idCampo}
        rotulo={rotulo}
        dica={dica}
        erro={erro}
        rotuloOculto={rotuloOculto}
        acessorio={acessorio}
      >
        <select
          ref={ref}
          id={idCampo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${idCampo}-erro` : dica ? `${idCampo}-dica` : undefined}
          className={cn(CONTROLE, "h-11 pr-9 appearance-none", erro ? COM_ERRO : NORMAL, className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a6672' stroke-width='2.2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "1.1rem",
          }}
          {...resto}
        >
          {children}
        </select>
      </Envelope>
    );
  }
);
