import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { ApiError, pedirRedefinicao, redefinirSenha } from "../api/client";
import { Marca } from "../components/site/Marca";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { ForcaDaSenha } from "../features/auth/ForcaDaSenha";
import { cn } from "../lib/cn";

const CAIXA = "rounded-[var(--radius-sm)] border px-3.5 py-3 text-[13.5px] leading-snug";

function Erro({ texto }: Readonly<{ texto: string }>) {
  return (
    <p role="alert" className={cn(CAIXA, "border-danger/35 bg-danger-bg text-danger")}>
      {texto}
    </p>
  );
}

function Sucesso() {
  return (
    <>
      <p className={cn(CAIXA, "flex items-start gap-2 border-success/35 bg-success-bg text-success")}>
        <CheckCircle2 aria-hidden className="mt-px size-4 shrink-0" />
        Pronto. Já pode entrar com a senha nova.
      </p>
      <Link
        to="/entrar"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-brand-600 px-4 text-sm font-semibold text-on-brand shadow-sm dark:text-[#07111c]"
      >
        Ir para o login
      </Link>
    </>
  );
}

function FormularioNovaSenha({
  token,
  aoConcluir,
}: Readonly<{ token: string; aoConcluir: () => void }>) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");

    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      aoConcluir();
    } catch (error) {
      setErro(
        error instanceof ApiError ? error.message : "Não foi possível redefinir a senha."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
      <div>
        <Input
          rotulo="Senha nova"
          type={verSenha ? "text" : "password"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          dica="Pelo menos 8 caracteres."
          acessorio={
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
            >
              {verSenha ? (
                <EyeOff aria-hidden className="size-3.5" />
              ) : (
                <Eye aria-hidden className="size-3.5" />
              )}
              {verSenha ? "Ocultar" : "Mostrar"}
            </button>
          }
        />
        <ForcaDaSenha senha={senha} />
      </div>

      <Input
        rotulo="Repita a senha"
        type={verSenha ? "text" : "password"}
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        autoComplete="new-password"
        required
      />

      {erro && <Erro texto={erro} />}

      <Button type="submit" tamanho="lg" larguraCheia carregando={enviando}>
        Salvar senha nova
      </Button>
    </form>
  );
}

// Sem token na URL a única coisa útil é pedir outro e-mail, então a tela
// oferece isso em vez de só reclamar do link.
function FormularioPedirLink() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function pedirOutro(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const { message } = await pedirRedefinicao(email.trim());
      setAviso(message);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={pedirOutro} noValidate className="flex flex-col gap-4">
      <p className={cn(CAIXA, "border-warning/35 bg-warning-bg text-warning")}>
        Esse link não tem token — ele expirou ou foi copiado incompleto. Informe seu e-mail e
        enviamos outro.
      </p>

      <Input
        rotulo="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      {aviso && (
        <output className={cn(CAIXA, "block border-success/35 bg-success-bg text-success")}>
          {aviso}
        </output>
      )}
      {erro && <Erro texto={erro} />}

      <Button type="submit" tamanho="lg" larguraCheia carregando={enviando}>
        Enviar novo link
      </Button>
    </form>
  );
}

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [pronto, setPronto] = useState(false);

  let titulo = "Pedir novo link";
  let conteudo: ReactNode = <FormularioPedirLink />;
  if (pronto) {
    titulo = "Senha redefinida";
    conteudo = <Sucesso />;
  } else if (token) {
    titulo = "Criar uma senha nova";
    conteudo = <FormularioNovaSenha token={token} aoConcluir={() => setPronto(true)} />;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="BuscaLED, página inicial">
            <Marca />
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="mt-8 text-[1.6rem] font-bold tracking-[-0.03em] text-ink">{titulo}</h1>

        <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface p-5">
          {conteudo}
        </div>

        <p className="mt-5 text-center text-[13.5px] text-muted">
          Lembrou a senha?{" "}
          <Link to="/entrar" className="font-semibold text-brand-600 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
