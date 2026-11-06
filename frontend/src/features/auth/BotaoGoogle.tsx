import { useEffect, useRef, useState } from "react";
import { entrarComGoogle } from "../../api/auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SRC = "https://accounts.google.com/gsi/client";

interface Credencial {
  credential?: string;
}

interface GoogleGlobal {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (resposta: Credencial) => void;
      }) => void;
      renderButton: (
        alvo: HTMLElement,
        opcoes: Record<string, string | number>
      ) => void;
    };
  };
}

function carregarScript(): Promise<void> {
  if (document.querySelector(`script[src="${SRC}"]`)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o Google Identity Services."));
    document.head.appendChild(script);
  });
}

/**
 * Sem VITE_GOOGLE_CLIENT_ID o componente não renderiza nada: um botão que não
 * pode funcionar é pior que botão nenhum. Em dev sobre HTTP o próprio Google
 * recusa o domínio, então a falha é silenciosa por design — o e-mail e senha
 * continuam ali do lado.
 */
export function BotaoGoogle({
  onEntrou,
  onErro,
}: {
  onEntrou: () => void;
  onErro: (mensagem: string) => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) {
      return;
    }
    let ativo = true;

    carregarScript()
      .then(() => {
        const google = (window as unknown as { google?: GoogleGlobal }).google;
        if (!ativo || !google || !alvo.current) {
          return;
        }
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resposta) => {
            if (!resposta.credential) {
              onErro("O Google não devolveu as credenciais. Tente de novo.");
              return;
            }
            entrarComGoogle(resposta.credential)
              .then(onEntrou)
              .catch(() => onErro("Não conseguimos entrar com o Google."));
          },
        });
        google.accounts.id.renderButton(alvo.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          locale: "pt-BR",
          width: 320,
        });
      })
      .catch(() => ativo && setIndisponivel(true));

    return () => {
      ativo = false;
    };
  }, [onEntrou, onErro]);

  if (!CLIENT_ID || indisponivel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={alvo} className="flex justify-center [color-scheme:light]" />
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
          ou
        </span>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
