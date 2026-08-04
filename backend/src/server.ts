import "dotenv/config";
import { createApp } from "./app";

const port = process.env.PORT ?? 3000;
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BuscaLED backend ouvindo na porta ${port}`);
});
