import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, pedirRedefinicao, registrar } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { IconeLampada } from "../components/Icones";

type Aba = "entrar" | "criar";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) {
    return <Navigate to="/painel/tickets" replace />;
  }

  function trocarAba(nova: Aba) {
    setAba(nova);
    setErro("");
    setAviso("");
  }

  async function entrar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate("/painel/tickets", { replace: true });
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  async function criarConta(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);
    try {
      const { message } = await registrar(nome.trim(), email.trim(), senha);
      // O cadastro não loga: a conta só vale depois de confirmar o e-mail.
      setAviso(message);
      setAba("entrar");
      setSenha("");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível criar a conta.");
    } finally {
      setEnviando(false);
    }
  }

  async function esqueciSenha() {
    setErro("");
    setAviso("");
    if (!email.trim()) {
      setErro("Informe seu e-mail acima para receber o link.");
      return;
    }
    setEnviando(true);
    try {
      const { message } = await pedirRedefinicao(email.trim());
      setAviso(message);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar o link.");
    } finally {
      setEnviando(false);
    }
  }

  const criando = aba === "criar";

  return (
    <main className="pagina-centrada">
      <div className="login-marca">
        <span className="login-marca-icone" style={{ color: "#ffffff" }}>
          <IconeLampada tamanho={21} />
        </span>
        <span className="login-marca-nome">
          Busca<span>LED</span>
        </span>
      </div>
      <p className="login-bemvindo">{criando ? "Crie sua conta" : "Bem-vindo de volta!"}</p>

      <div className="cartao-login">
        <div className="abas" role="tablist" aria-label="Entrar ou criar conta">
          <button
            type="button"
            role="tab"
            aria-selected={!criando}
            className={criando ? "aba" : "aba aba-ativa"}
            onClick={() => trocarAba("entrar")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={criando}
            className={criando ? "aba aba-ativa" : "aba"}
            onClick={() => trocarAba("criar")}
          >
            Criar conta
          </button>
        </div>

        {aviso && <p className="mensagem-aviso">{aviso}</p>}

        <form onSubmit={criando ? criarConta : entrar} className="formulario">
          {criando && (
            <>
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </>
          )}

          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={criando ? "new-password" : "current-password"}
            minLength={criando ? 8 : undefined}
            required
          />
          {criando ? (
            <small className="dica-campo">Pelo menos 8 caracteres.</small>
          ) : (
            <button type="button" className="link-discreto" onClick={esqueciSenha}>
              Esqueci minha senha
            </button>
          )}

          <button type="submit" className="botao-primario" disabled={enviando}>
            {enviando
              ? criando
                ? "Criando…"
                : "Entrando…"
              : criando
                ? "Criar minha conta"
                : "Entrar na minha conta"}
          </button>
        </form>

        {erro && (
          <p role="alert" className="mensagem-erro" style={{ marginTop: 16, marginBottom: 0 }}>
            {erro}
          </p>
        )}
      </div>
    </main>
  );
}
