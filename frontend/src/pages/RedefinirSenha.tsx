import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, redefinirSenha } from "../api/client";
import { IconeLampada } from "../components/Icones";

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");

    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      setPronto(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível redefinir a senha.");
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
      <p className="login-bemvindo">Criar uma senha nova</p>

      <div className="cartao-login">
        {!token && (
          <p role="alert" className="mensagem-erro">
            Link inválido: falta o token. Peça um novo e-mail de redefinição.
          </p>
        )}

        {pronto ? (
          <>
            <p className="mensagem-aviso">Senha redefinida. Já pode entrar com a senha nova.</p>
            <Link to="/login" className="botao-primario botao-largo">
              Ir para o login
            </Link>
          </>
        ) : (
          <form onSubmit={enviar} className="formulario">
            <label htmlFor="senha">Senha nova</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <small className="dica-campo">Pelo menos 8 caracteres.</small>

            <label htmlFor="confirmacao">Repita a senha</label>
            <input
              id="confirmacao"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button type="submit" className="botao-primario" disabled={enviando || !token}>
              {enviando ? "Salvando…" : "Salvar senha nova"}
            </button>
          </form>
        )}

        {erro && (
          <p role="alert" className="mensagem-erro" style={{ marginTop: 16, marginBottom: 0 }}>
            {erro}
          </p>
        )}
      </div>
    </main>
  );
}
