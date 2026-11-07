import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Tema = "sistema" | "claro" | "escuro";

interface Contexto {
  tema: Tema;
  /** O tema que está de fato na tela agora, já resolvido. */
  resolvido: "claro" | "escuro";
  definirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<Contexto | null>(null);
const CHAVE = "buscaled:tema";

function lerSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === "claro" || salvo === "escuro" ? salvo : "sistema";
  } catch {
    // Navegação privada ou storage bloqueado: segue o sistema.
    return "sistema";
  }
}

function prefereEscuro(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerSalvo);
  const [sistemaEscuro, setSistemaEscuro] = useState(prefereEscuro);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) {
      return;
    }
    const aoTrocar = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches);
    mq.addEventListener("change", aoTrocar);
    return () => mq.removeEventListener("change", aoTrocar);
  }, []);

  // O CSS resolve "sistema" sozinho pelo prefers-color-scheme, então sem
  // escolha manual o atributo sai do html em vez de ser fixado.
  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") {
      raiz.removeAttribute("data-theme");
    } else {
      raiz.setAttribute("data-theme", tema === "escuro" ? "dark" : "light");
    }
  }, [tema]);

  const definirTema = useCallback((novo: Tema) => {
    setTema(novo);
    try {
      if (novo === "sistema") {
        localStorage.removeItem(CHAVE);
      } else {
        localStorage.setItem(CHAVE, novo);
      }
    } catch {
      // Preferência não persistida é aceitável; a sessão atual já trocou.
    }
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      tema,
      resolvido: tema === "sistema" ? (sistemaEscuro ? "escuro" : "claro") : tema,
      definirTema,
    }),
    [tema, sistemaEscuro, definirTema]
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTema(): Contexto {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTema precisa estar dentro de <ThemeProvider>.");
  }
  return ctx;
}
