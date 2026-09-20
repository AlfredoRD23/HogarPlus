import { createApp } from "./app";
import { config } from "./config/env";
import { prisma } from "./lib/prisma";

async function main() {
  await prisma.$connect();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`HogarPlus API lista en http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
