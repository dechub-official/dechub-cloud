import { env } from './config/env';
import { connectDb } from './config/db';
import { createApp } from './app';

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => console.log(`Dechub API listening on port ${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
