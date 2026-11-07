import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";

/**
 * Onde as imagens enviadas pelo painel ficam. Configurável porque disco de
 * container é efêmero: num deploy real isto aponta para um volume montado ou
 * é trocado por armazenamento de objeto.
 */
export const DIRETORIO_UPLOADS = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads")
);

export const PREFIXO_PUBLICO = "/uploads";

const TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024;

// Lista fechada: o tipo decide a extensão, e não o nome que veio do cliente.
const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export class TipoDeImagemInvalidoError extends Error {
  constructor() {
    super("Envie uma imagem JPG, PNG, WEBP ou AVIF.");
    this.name = "TipoDeImagemInvalidoError";
  }
}

if (!existsSync(DIRETORIO_UPLOADS)) {
  mkdirSync(DIRETORIO_UPLOADS, { recursive: true });
}

const armazenamento = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, DIRETORIO_UPLOADS),
  // Nome sorteado: o nome original nunca toca o disco, então não existe
  // travessia de caminho nem colisão entre envios.
  filename: (_req, file, callback) =>
    callback(null, `${randomUUID()}${EXTENSAO_POR_TIPO[file.mimetype] ?? ""}`),
});

export const uploadDeImagem = multer({
  storage: armazenamento,
  limits: { fileSize: TAMANHO_MAXIMO_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!EXTENSAO_POR_TIPO[file.mimetype]) {
      callback(new TipoDeImagemInvalidoError());
      return;
    }
    callback(null, true);
  },
});

/** Caminho que o frontend usa no `src` da imagem. */
export function urlPublicaDoArquivo(nomeDoArquivo: string): string {
  return `${PREFIXO_PUBLICO}/${nomeDoArquivo}`;
}
