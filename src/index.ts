import { createRepository, createService, loadConfig } from './config';
import { createApp } from './infra/http/app';

async function main(): Promise<void> {
  const config = loadConfig();
  const repository = await createRepository(config);
  const service = createService(repository, config);
  const app = createApp(service);

  app.listen(config.port, () => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: `URL shortener listening on port ${config.port}`,
        short_url_base: config.shortUrlBase,
        repository: config.repositoryType,
        redis: Boolean(config.redisUrl),
      }),
    );
  });
}

main().catch((err) => {
  console.error(JSON.stringify({ level: 'error', message: err.message, stack: err.stack }));
  process.exit(1);
});
