# URL Shortener Service

A backend service that shortens long URLs into unique, short slugs and redirects clients to the original URL when the slug is visited. TypeScript + Express, with pluggable persistence (in-memory by default).

Development is spec-driven: everything under [`specs/`](specs/) is the source of truth — [`specs/SPEC.md`](specs/SPEC.md) (product/engineering spec) and [`specs/openapi.yaml`](specs/openapi.yaml) (API contract). Changes start in the spec, flow into acceptance criteria and tests, and only then into code; see [`specs/README.md`](specs/README.md) for the workflow and the AC-to-test traceability matrix.

## API

| Method | Path       | Purpose                 | Success            | Failure             |
| ------ | ---------- | ----------------------- | ------------------ | ------------------- |
| POST   | `/v1/urls` | Create shortened URL    | `201`              | `400`, `422`, `500` |
| GET    | `/{slug}`  | Redirect to destination | `302` + `Location` | `404`, `410`, `500` |

All error responses have the shape `{ "error": "<CODE>", "message": "<human readable>" }`.

## Running

| Command       | Description                                                       |
| ------------- | ----------------------------------------------------------------- |
| `npm install` | Install project dependencies (run once).                          |
| `npm run dev` | Start the development server with automatic reload (`tsx watch`). |
| `npm start`   | Start the application in production mode.                         |

The server listens on port 3000 by default.

### Configuration

| Env var          | Default                 | Purpose                                                                                                                                                     |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`           | `3000`                  | HTTP listen port                                                                                                                                            |
| `SHORT_URL_BASE` | `http://localhost:3000` | Base used to build `short_url` values (e.g. `https://short.example.com`). Its hostname is automatically blocked as a destination to prevent redirect loops. |

### Try it

```bash
curl -s -X POST localhost:3000/v1/urls \
  -H 'Content-Type: application/json' \
  -d '{"destination_url": "https://www.example.com/some/very/long/path?query=value"}'

curl -i localhost:3000/<slug>   # → 302 with Location header
```

## Tests

```bash
npm test           # unit + integration + contract (Vitest)
npm run typecheck  # tsc --noEmit (strict mode)
npm run lint       # eslint
```

- **Unit** (`tests/unit/`): slug generator (format, collision retry), URL validator, `UrlShortenerService` with a mocked repository.
- **Integration** (`tests/integration/`): every acceptance criterion AC-1..AC-7 from `specs/SPEC.md` section 8, run with Supertest against the in-memory repository.
- **Contract**: response bodies are validated against the schemas in `specs/openapi.yaml` (ajv).

The mapping from each acceptance criterion to its test lives in [`specs/README.md`](specs/README.md).

## Architecture

```
specs/             # source of truth: SPEC.md, openapi.yaml, SDD workflow + traceability
src/
  domain/          # ShortUrl entity, UrlRepository interface, domain errors
  services/        # UrlShortenerService, slug generator, URL validator
  infra/
    persistence/   # InMemoryUrlRepository (default)
    http/          # Express app, routes, error-mapping middleware, request logging
  config/          # DI wiring + env config — repository implementation chosen here
tests/
  unit/
  integration/
```

Layering rule: `services/` depends only on the `UrlRepository` interface (`src/domain/url-repository.ts`), never on a concrete persistence class.

## Swapping the persistence layer

1. Add a new class under `src/infra/persistence/` implementing `UrlRepository`:

   ```ts
   import type { ShortUrl, UrlRepository } from "../../domain";

   export class PostgresUrlRepository implements UrlRepository {
     create(entry: Omit<ShortUrl, "id">): Promise<ShortUrl> {
       /* ... */
     }
     findBySlug(slug: string): Promise<ShortUrl | null> {
       /* ... */
     }
     existsBySlug(slug: string): Promise<boolean> {
       /* ... */
     }
   }
   ```

2. Change one line in `src/config/index.ts`:

   ```ts
   export function createRepository(): UrlRepository {
     return new PostgresUrlRepository(/* connection */);
   }
   ```

No route, service, or middleware code changes are required.
