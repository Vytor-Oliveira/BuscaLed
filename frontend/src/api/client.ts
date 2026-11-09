// Em produção a API vem do mesmo servidor da SPA e VITE_API_URL é vazia. String
// vazia não é base válida para `new URL` — por isso o fallback é a origem da
// página, e não o endereço de desenvolvimento.
export function baseDaApi(): string {
  const configurada = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  return configurada === "" ? window.location.origin : configurada;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path, baseDaApi());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * A sessão é um cookie httpOnly, então toda chamada precisa de
 * `credentials: "include"` — sem isso o navegador não manda o cookie e tudo
 * volta 401. Erro HTTP vira ApiError com a mensagem que o backend mandou,
 * porque as rotas respondem `{ error: "..." }` em português.
 */
export function registrar(
  name: string,
  email: string,
  password: string
): Promise<{ message: string }> {
  return api<{ message: string }>("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
}

export function pedirRedefinicao(email: string): Promise<{ message: string }> {
  return api<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function redefinirSenha(token: string, password: string): Promise<{ message: string }> {
  return api<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Não foi possível falar com a API em ${baseDaApi()}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Erro ${response.status}.`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}
