import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Catálogo inicial de produtos LED por soquete — RFC, Apêndice C.
 * Só 6 tipos de soquete têm produto conhecido hoje; os outros ~73 soquetes
 * encontrados na planilha real da Shocklight (importados separadamente por
 * scripts/import-compat-matrix.ts) ficam sem produto até um admin cadastrar
 * mais via POST /catalog/led-models.
 *
 * Nota: a RFC usa "W21" como atalho pro soquete da lanterna, mas o código
 * real de soquete automotivo (e o que aparece na planilha de verdade) é
 * "W21W" — usamos o código real aqui, pra bater com o dado importado.
 */
const LED_CATALOG: Array<{
  sku: string;
  name: string;
  description?: string;
  socketCode: string;
}> = [
  // H4 — farol baixo/alto
  { sku: "SHK-S14-H4", name: "Headlight S14 Nano", description: "32W / 3600lm / 6000K", socketCode: "H4" },
  { sku: "SHK-S14X-H4", name: "Kit LED Nano S14X", description: "22W / 5000lm / 6500K", socketCode: "H4" },
  { sku: "SHK-S16-H4", name: "Ultraled S16 Nano", description: "40W / 4200lm / 6000K", socketCode: "H4" },
  { sku: "SHK-S17-H4", name: "Ultraled S17 Nano", description: "55W / 5000lm / 6000K", socketCode: "H4" },
  { sku: "SHK-S17X-H4", name: "Ultraled S17X", description: "55W / 5500lm / 6500K", socketCode: "H4" },
  { sku: "SHK-INFINITY-H4", name: "Ultraled Infinity", description: "90W / 15000lm / 6500K", socketCode: "H4" },

  // H7 — farol baixo/alto
  { sku: "SHK-S14-H7", name: "Headlight S14 Nano H7", socketCode: "H7" },
  { sku: "SHK-S14X-H7", name: "Kit LED Nano S14X H7", socketCode: "H7" },
  { sku: "SHK-S16-H7", name: "Ultraled S16 Nano H7", socketCode: "H7" },
  { sku: "SHK-S17-H7", name: "Ultraled S17 Nano H7", socketCode: "H7" },

  // H1 — farol alto
  { sku: "SHK-S14X-H1", name: "Kit LED Nano S14X H1", socketCode: "H1" },
  { sku: "SHK-S17-H1", name: "Ultraled S17 Nano H1", socketCode: "H1" },

  // H11 — neblina
  { sku: "SHK-S14X-H11", name: "Kit LED Nano S14X H11", socketCode: "H11" },
  { sku: "SHK-S16-H11", name: "Ultraled S16 Nano H11", socketCode: "H11" },
  { sku: "SHK-GOLD-H11", name: "Ultraled Gold H11", socketCode: "H11" },

  // HB3/HB4 — farol alto/neblina (a RFC lista como uma linha só; vira 2 socketCodes)
  { sku: "SHK-S14X-HB3", name: "Kit LED Nano S14X HB3", socketCode: "HB3" },
  { sku: "SHK-S14-HB3", name: "Headlight S14 Nano HB3", socketCode: "HB3" },
  { sku: "SHK-S14X-HB4", name: "Kit LED Nano S14X HB4", socketCode: "HB4" },
  { sku: "SHK-S14-HB4", name: "Headlight S14 Nano HB4", socketCode: "HB4" },

  // W21W — lanterna
  { sku: "SHK-W21-LANTERNA", name: "Shocklight W21 LED", socketCode: "W21W" },
];

async function main(): Promise<void> {
  for (const product of LED_CATALOG) {
    await prisma.ledModel.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Catálogo semeado: ${LED_CATALOG.length} produtos.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
