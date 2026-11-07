import { api } from "./client";
import type { AuthUser } from "../auth/AuthContext";

export { registrar, pedirRedefinicao, redefinirSenha } from "./client";

export function entrar(email: string, password: string): Promise<void> {
  return api("/auth/login", { method: "POST", body: { email, password } });
}

export function sair(): Promise<void> {
  return api("/auth/logout", { method: "POST" });
}

export function perfilAtual(): Promise<{ user: AuthUser }> {
  return api<{ user: AuthUser }>("/auth/me");
}

/** Google Identity Services devolve um idToken; o backend o valida. */
export function entrarComGoogle(idToken: string): Promise<void> {
  return api("/auth/google", { method: "POST", body: { idToken } });
}
