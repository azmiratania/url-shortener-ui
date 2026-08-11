import { Pool } from 'pg';
import { createClient } from 'redis';

import type { UrlRepository } from '../domain';
import { CachedUrlRepository } from '../infra/persistence/cached-url-repository';
import { InMemoryUrlRepository } from '../infra/persistence/in-memory-url-repository';
import { PostgresUrlRepository } from '../infra/persistence/postgres-url-repository';
import { NullSlugCache, RedisSlugCache } from '../infra/cache/slug-cache';
import { UrlShortenerService } from '../services/url-shortener-service';

export interface AppConfig {
  port: number;
  shortUrlBase: string;
  repositoryType: 'memory' | 'postgres';
  databaseUrl?: string;
  redisUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    port: Number(env.PORT ?? 3000),
    shortUrlBase: env.SHORT_URL_BASE ?? 'http://localhost:3000',
    repositoryType: env.REPOSITORY_TYPE === 'postgres' ? 'postgres' : 'memory',
  };

  if (env.DATABASE_URL) {
    config.databaseUrl = env.DATABASE_URL;
  }
  if (env.REDIS_URL) {
    config.redisUrl = env.REDIS_URL;
  }

  return config;
}

export async function createRepository(config: AppConfig): Promise<UrlRepository> {
  let repository: UrlRepository;

  if (config.repositoryType === 'postgres') {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required when REPOSITORY_TYPE=postgres');
    }
    const pool = new Pool({ connectionString: config.databaseUrl });
    repository = await PostgresUrlRepository.initialize(pool);
  } else {
    repository = new InMemoryUrlRepository();
  }

  if (config.redisUrl) {
    const client = createClient({ url: config.redisUrl });
    client.on('error', (err) => {
      console.error(JSON.stringify({ level: 'error', message: 'Redis client error', detail: err.message }));
    });
    await client.connect();
    const cache = new RedisSlugCache(client);
    return new CachedUrlRepository(repository, cache, (slug) => cache.rememberMissing(slug));
  }

  return new CachedUrlRepository(repository, new NullSlugCache(), async () => {});
}

export function createService(repository: UrlRepository, config: AppConfig): UrlShortenerService {
  return new UrlShortenerService(repository, { shortUrlBase: config.shortUrlBase });
}
