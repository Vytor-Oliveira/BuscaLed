import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { ApiError } from "../api/client";
import { registrar } from "../api/auth";
import { useAuth, type UserRole } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { CarregandoSessao } from "../components/ui/CarregandoSessao";
import { Marca } from "../components/site/Marca";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { BotaoGoogle } from "../features/auth/BotaoGoogle";
import { ForcaDaSenha } from "../features/auth/ForcaDaSenha";
import { cn } from "../lib/cn";

/** O painel é de rep/admin; mandar o cliente para lá cai em "Sem permissão". */
function destinoPorPapel(role: UserRole): string {
  return role === "user" ? "/garagem" : "/painel";
}

const MENSAGEM_CONFIRMACAO: Record<string, { tom: "ok" | "erro"; texto: string }> = {
  ok: {
    tom: "ok",
    texto: "E-mail confirmado. Agora você já pode entrar com a sua senha.",
  },
  invalida: {
    tom: "erro",
    texto: "Esse link de confirmação é inválido ou já expirou. Cadastre-se de novo ou peça outro.",
  },
};

export default function Entrar() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [aba, setAba] = useState("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const confirmacao = MENSAGEM_CONFIRMACAO[params.get("confirmacao") ?? ""];
  // Guardado pelo RequireRole: volta para onde o visitante estava.
  const origem = (location.state as { de?: string } | null)?.de;

  const depoisDeEntrar = useCallback(
    (role: UserRole) => navigate(origem ?? destinoPorPapel(role), { replace: true }),
    [navigate, origem]
  );

  if (loading) {
    return <CarregandoSessao />;
  }

  if (user) {
    return <Navigate to={origem ?? destinoPorPapel(user.role)} replace />;
  }

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);

    try {
      if (aba === "criar") {
        const { message } = await registrar(nome.trim(), email.trim(), senha);
        // O cadastro não loga: a conta só vale depois de confirmar o e-mail.
        setAviso(message);
        setAba("entrar");
        setSenha("");
        setNome("");
      } else {
        const perfil = await login(email.trim(), senha);
        if (perfil) {
          depoisDeEntrar(perfil.role);
        } else {
          // A senha estava certa, mas a sessão não veio — cookie recusado, por
          // exemplo. Sem esta mensagem a tela só ficava parada.
          setErro(
            "Entramos, mas não foi possível carregar seu perfil. Tente de novo em instantes."
          );
        }
      }
    } catch (falha) {
      setErro(
        falha instanceof ApiError
          ? falha.message
          : "Não conseguimos falar com o servidor. Tente de novo."
      );
    } finally {
      setEnviando(false);
    }
  }

  const criando = aba === "criar";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* Lado da marca: só no desktop. No celular, formulário e nada mais. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-800 p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent-500/20 blur-3xl"
        />
        <Link to="/" aria-label="BuscaLED, página inicial" className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-accent-400">
              <Lightbulb aria-hidden className="size-5" />
            </span>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-white">
              Busca<span className="text-accent-400">LED</span>
            </span>
          </span>
        </Link>

        <div className="relative max-w-sm">
          <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.03em] text-white">
            A resposta vem por posição de farol
          </h2>
          {/* brand-200, não brand-100: o brand-100 é redefinido no tema escuro
              para um azul quase igual a este fundo fixo, e o texto sumia. */}
          <p className="mt-4 text-[15px] leading-relaxed text-brand-200">
            Farol baixo, alto, neblina e lanterna usam encaixes diferentes no mesmo
            carro. Entre para salvar seus veículos e acompanhar seus pedidos.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              { Icone: ShieldCheck, texto: "Sua placa nunca é armazenada." },
              { Icone: Sparkles, texto: "Garagem virtual com seus carros salvos." },
              { Icone: CheckCircle2, texto: "Acompanhamento de cada reserva." },
            ].map(({ Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-[14px] text-brand-200">
                <Icone aria-hidden className="size-4.5 shrink-0 text-accent-400" />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12.5px] text-brand-200">
          Catálogo e matriz de aplicação fornecidos pela Shocklight.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <Link to="/" aria-label="BuscaLED, página inicial">
              <Marca />
            </Link>
            <ThemeToggle />
          </div>

          <h1 className="mt-8 text-[1.6rem] font-bold tracking-[-0.03em] text-ink lg:mt-0">
            {criando ? "Criar sua conta" : "Entrar na sua conta"}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            {criando
              ? "Leva menos de um minuto. Depois confirme o e-mail."
              : "Use o e-mail e a senha que você cadastrou."}
          </p>

          {confirmacao && (
            <p
              role={confirmacao.tom === "erro" ? "alert" : "status"}
              className={cn(
                "mt-5 rounded-[var(--radius-sm)] border px-3.5 py-3 text-[13.5px] leading-snug",
                confirmacao.tom === "ok"
                  ? "border-success/35 bg-success-bg text-success"
                  : "border-danger/35 bg-danger-bg text-danger"
              )}
            >
              {confirmacao.texto}
            </p>
          )}

          <div className="mt-6">
            <Tabs
              value={aba}
              onValueChange={(v) => {
                setAba(v);
                setErro("");
              }}
            >
              <TabsList rotulo="Entrar ou criar conta">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <form onSubmit={submeter} noValidate className="mt-5 flex flex-col gap-4">
                <TabsContent value="criar" className="flex flex-col gap-4">
                  <Input
                    rotulo="Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    required={criando}
                  />
                </TabsContent>

                <Input
                  rotulo="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <div>
                  <Input
                    rotulo="Senha"
                    type={verSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete={criando ? "new-password" : "current-password"}
                    required
                    minLength={criando ? 8 : undefined}
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
                  {criando && <ForcaDaSenha senha={senha} />}
                </div>

                {aviso && (
                  <p
                    role="status"
                    className="rounded-[var(--radius-sm)] border border-success/35 bg-success-bg px-3.5 py-3 text-[13.5px] leading-snug text-success"
                  >
                    {aviso}
                  </p>
                )}

                {erro && (
                  <p
                    role="alert"
                    className="rounded-[var(--radius-sm)] border border-danger/35 bg-danger-bg px-3.5 py-3 text-[13.5px] leading-snug text-danger"
                  >
                    {erro}
                  </p>
                )}

                <Button type="submit" tamanho="lg" larguraCheia carregando={enviando}>
                  {criando ? "Criar minha conta" : "Entrar na minha conta"}
                </Button>
              </form>

              <div className="mt-6">
                <BotaoGoogle
                  onEntrou={() => window.location.assign(origem ?? "/garagem")}
                  onErro={setErro}
                />
              </div>
            </Tabs>
          </div>

          {!criando && (
            <p className="mt-5 text-center text-[13.5px] text-muted">
              Esqueceu a senha?{" "}
              <Link to="/redefinir-senha" className="font-semibold text-brand-600 underline">
                Redefinir por e-mail
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
