import type { DomainError } from '../../domain';

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} · Link Shortener</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛓</text></svg>" />
  <style>
    :root { color-scheme: dark light; --bg:#06070d; --text:#f4f6fb; --muted:#94a3b8; --accent:#5eead4; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f8fafc; --text:#0f172a; --muted:#64748b; --accent:#0d9488; }
    }
    body {
      margin:0; min-height:100vh; display:grid; place-items:center; font-family:system-ui,sans-serif;
      background:var(--bg); color:var(--text); padding:2rem;
    }
    .card {
      max-width:28rem; text-align:center; padding:2rem; border-radius:1rem;
      border:1px solid rgba(127,127,127,.25); background:rgba(127,127,127,.08);
    }
    h1 { margin:0 0 .75rem; font-size:1.75rem; }
    p { margin:0 0 1.5rem; color:var(--muted); line-height:1.6; }
    a {
      display:inline-block; padding:.75rem 1.25rem; border-radius:.75rem;
      background:var(--accent); color:#04110f; text-decoration:none; font-weight:600;
    }
    code { font-family:ui-monospace,monospace; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`;
}

export function renderNotFoundPage(slug: string): string {
  return pageShell(
    'Not Found',
    `<h1>404 · Not found</h1>
     <p>No shortened URL exists for <code>${escapeHtml(slug)}</code>.</p>
     <a href="/">Create a new link</a>`,
  );
}

export function renderGonePage(slug: string): string {
  return pageShell(
    'Gone',
    `<h1>410 · Link unavailable</h1>
     <p>The link <code>${escapeHtml(slug)}</code> was deleted, expired, or reached its click limit.</p>
     <a href="/">Create a new link</a>`,
  );
}

export function renderPreviewPage(options: {
  slug: string;
  destinationUrl: string;
  shortUrl: string;
}): string {
  const { slug, destinationUrl, shortUrl } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview · ${escapeHtml(slug)}</title>
  <meta property="og:title" content="Link preview" />
  <meta property="og:description" content="${escapeHtml(destinationUrl)}" />
  <meta property="og:url" content="${escapeHtml(shortUrl)}" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛓</text></svg>" />
  <style>
    body { margin:0; min-height:100vh; font-family:system-ui,sans-serif; display:grid; place-items:center;
      background:#06070d; color:#f4f6fb; padding:1.5rem; }
    .card { max-width:32rem; width:100%; padding:2rem; border-radius:1rem;
      border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); }
    h1 { margin:0 0 .5rem; font-size:1.5rem; }
    .dest { word-break:break-all; color:#94a3b8; margin:0 0 1.5rem; }
    .actions { display:flex; gap:.75rem; flex-wrap:wrap; }
    a, button {
      padding:.875rem 1.25rem; border-radius:.75rem; font-weight:600; cursor:pointer; border:none;
      text-decoration:none; font-size:1rem;
    }
    .primary { background:#5eead4; color:#04110f; }
    .secondary { background:rgba(255,255,255,.08); color:#f4f6fb; border:1px solid rgba(255,255,255,.12); }
  </style>
</head>
<body>
  <div class="card">
    <h1>You're leaving Link Shortener</h1>
    <p class="dest">${escapeHtml(destinationUrl)}</p>
    <div class="actions">
      <a class="primary" href="${escapeHtml(destinationUrl)}" rel="noopener noreferrer">Continue to destination</a>
      <a class="secondary" href="/">Go home</a>
    </div>
  </div>
</body>
</html>`;
}

export function renderHtmlError(error: DomainError, slug?: string): string | null {
  if (error.code === 'NOT_FOUND' && slug) {
    return renderNotFoundPage(slug);
  }
  if (error.code === 'GONE' && slug) {
    return renderGonePage(slug);
  }
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
