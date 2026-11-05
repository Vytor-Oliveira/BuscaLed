import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { IconeLampada } from "../components/Icones";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) {
    return <Navigate to="/painel/tickets" replace />;
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
      <p className="login-bemvindo">Bem-vindo de volta!</p>

      <div className="cartao-login">
        <div className="abas" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" aria-selected="true" className="aba aba-ativa">
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="aba"
            disabled
            title="Cadastro ainda não disponível nesta tela"
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={entrar} className="formulario">
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
            autoComplete="current-password"
            required
          />

          <button type="submit" className="botao-primario" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar na minha conta"}
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
