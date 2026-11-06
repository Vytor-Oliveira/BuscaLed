import { useRef, useState } from "react";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { ApiError } from "../../../api/client";
import { enviarImagemProduto } from "../../../api/catalog";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";

interface Props {
  valor: string | null;
  onMudar: (imageUrl: string | null) => void;
}

/** O backend recusa acima disto; avisar antes evita a ida perdida ao servidor. */
const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function CampoImagem({ valor, onMudar }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) {
      return;
    }
    setErro("");

    if (!TIPOS.includes(arquivo.type)) {
      setErro("Use uma imagem JPG, PNG, WEBP ou AVIF.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErro("A imagem precisa ter no máximo 3 MB.");
      return;
    }

    setEnviando(true);
    try {
      onMudar(await enviarImagemProduto(arquivo));
    } catch (falha) {
      setErro(
        falha instanceof ApiError ? falha.message : "Não foi possível enviar a imagem."
      );
    } finally {
      setEnviando(false);
      // Permite reenviar o mesmo arquivo depois de um erro.
      if (entrada.current) {
        entrada.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink">Foto do produto</span>

      <div className="flex items-start gap-3">
        {valor ? (
          <img
            src={valor}
            alt="Prévia da foto do produto"
            width={80}
            height={80}
            className="size-20 shrink-0 rounded-[var(--radius-sm)] border border-line bg-white object-contain p-1"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong bg-sunken text-subtle"
          >
            <ImageOff className="size-6" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={entrada}
            type="file"
            accept={TIPOS.join(",")}
            className="sr-only"
            aria-label="Escolher a foto do produto"
            onChange={(e) => void escolher(e.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variante="secundario"
              tamanho="sm"
              Icone={Upload}
              carregando={enviando}
              onClick={() => entrada.current?.click()}
            >
              {valor ? "Trocar foto" : "Escolher foto"}
            </Button>

            {valor && (
              <Button
                type="button"
                variante="fantasma"
                tamanho="sm"
                Icone={Trash2}
                onClick={() => onMudar(null)}
              >
                Remover
              </Button>
            )}
          </div>

          <p className={cn("text-[12.5px] leading-snug", erro ? "text-danger" : "text-muted")}>
            {erro || "JPG, PNG, WEBP ou AVIF, até 3 MB. A foto aparece na vitrine e no painel."}
          </p>
        </div>
      </div>
    </div>
  );
}
