import { createUrl, deleteUrl, exportUrl, listUrls, qrUrl, type ShortUrlRecord } from './api';

const THEME_KEY = 'url-shortener-theme';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function initApp(root: HTMLElement): void {
  setTheme(getTheme());

  root.innerHTML = `
    <div class="bg" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="grid-overlay"></div>
    </div>
    <canvas id="confetti-canvas" aria-hidden="true"></canvas>
    <main>
      <header>
        <div class="top-bar">
          <button type="button" class="logo" id="logo-home" aria-label="Reload page">⛓</button>
          <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">◐</button>
        </div>
        <h1>Shorten your <em>links</em></h1>
        <p class="subtitle">Custom slugs, expiration, analytics, QR codes, and preview pages — all in one place.</p>
        <div class="stats">
          <div class="stat"><span class="stat-value" id="stat-count">0</span><span class="stat-label">Links</span></div>
          <div class="stat"><span class="stat-value" id="stat-clicks">0</span><span class="stat-label">Total clicks</span></div>
        </div>
        <p class="hint"><kbd>⌘/Ctrl</kbd> + <kbd>Enter</kbd> to shorten · paste a URL anywhere</p>
      </header>

      <div class="card-wrap">
        <div class="card">
          <div class="card-inner">
            <form id="shorten-form">
              <label for="destination">Destination URL</label>
              <div class="input-group">
                <input id="destination" name="destination" type="url" placeholder="https://example.com/very/long/path" autocomplete="url" required />
              </div>

              <details class="advanced">
                <summary>Advanced options</summary>
                <div class="advanced-grid">
                  <label>Custom slug<input id="custom-slug" name="custom_slug" type="text" placeholder="my-link" pattern="[A-Za-z0-9_-]{3,32}" /></label>
                  <label>Expires at<input id="expires-at" name="expires_at" type="datetime-local" /></label>
                  <label>Max clicks<input id="max-clicks" name="max_clicks" type="number" min="1" placeholder="100" /></label>
                  <label class="checkbox"><input id="preview-enabled" type="checkbox" /> Show preview page before redirect</label>
                </div>
              </details>

              <button type="submit" class="submit-btn" id="submit-btn"><span class="spinner"></span><span class="btn-text">Shorten URL</span></button>
            </form>

            <div id="feedback" class="message" role="alert" hidden></div>

            <div id="result" class="result" aria-live="polite">
              <div class="result-header"><span class="result-badge"><span class="result-badge-dot"></span>Ready to share</span></div>
              <div class="result-row">
                <a id="short-link" class="result-link" href="#" target="_blank" rel="noopener noreferrer"></a>
                <button type="button" class="copy-btn" id="copy-btn">Copy</button>
              </div>
              <p class="result-meta" id="destination-display"></p>
              <div class="result-extras">
                <img id="qr-image" class="qr-image" alt="QR code for short link" width="128" height="128" />
                <div class="result-stats" id="result-stats"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="history" id="history-section" hidden>
        <div class="history-header">
          <h2>Your links</h2>
          <div class="history-actions">
            <a class="ghost-btn" id="export-json" href="${exportUrl('json')}" download="links.json">Export JSON</a>
            <a class="ghost-btn" id="export-csv" href="${exportUrl('csv')}" download="links.csv">Export CSV</a>
          </div>
        </div>
        <ul class="history-list" id="history-list"></ul>
      </section>

      <footer>Built for speed · Rate-limited · Safe URL scanning enabled</footer>
    </main>
  `;

  const form = root.querySelector<HTMLFormElement>('#shorten-form')!;
  const input = root.querySelector<HTMLInputElement>('#destination')!;
  const submitBtn = root.querySelector<HTMLButtonElement>('#submit-btn')!;
  const feedback = root.querySelector<HTMLDivElement>('#feedback')!;
  const result = root.querySelector<HTMLDivElement>('#result')!;
  const shortLink = root.querySelector<HTMLAnchorElement>('#short-link')!;
  const copyBtn = root.querySelector<HTMLButtonElement>('#copy-btn')!;
  const destinationDisplay = root.querySelector<HTMLParagraphElement>('#destination-display')!;
  const historySection = root.querySelector<HTMLElement>('#history-section')!;
  const historyList = root.querySelector<HTMLUListElement>('#history-list')!;
  const statCount = root.querySelector<HTMLSpanElement>('#stat-count')!;
  const statClicks = root.querySelector<HTMLSpanElement>('#stat-clicks')!;
  const qrImage = root.querySelector<HTMLImageElement>('#qr-image')!;
  const resultStats = root.querySelector<HTMLDivElement>('#result-stats')!;
  const confettiCanvas = root.querySelector<HTMLCanvasElement>('#confetti-canvas')!;
  const logoHome = root.querySelector<HTMLButtonElement>('#logo-home')!;
  const themeToggle = root.querySelector<HTMLButtonElement>('#theme-toggle')!;

  function showFeedback(text: string, type: 'success' | 'error'): void {
    feedback.textContent = text;
    feedback.className = `message ${type}`;
    feedback.hidden = false;
  }

  function hideFeedback(): void {
    feedback.hidden = true;
  }

  function setLoading(loading: boolean): void {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.querySelector('.btn-text')!.textContent = loading ? 'Shortening…' : 'Shorten URL';
  }

  function updateStats(items: ShortUrlRecord[]): void {
    statCount.textContent = String(items.length);
    statClicks.textContent = String(items.reduce((sum, item) => sum + item.click_count, 0));
  }

  async function renderHistory(): Promise<void> {
    try {
      const items = await listUrls();
      historyList.innerHTML = '';
      updateStats(items);

      if (items.length === 0) {
        historySection.hidden = true;
        return;
      }

      historySection.hidden = false;
      for (const [index, item] of items.entries()) {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.style.animationDelay = `${index * 0.04}s`;
        li.innerHTML = `
          <a class="history-slug" href="${escapeHtml(item.short_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.slug)}</a>
          <span class="history-dest" title="${escapeHtml(item.destination_url)}">${escapeHtml(item.destination_url)}</span>
          <span class="history-clicks">${item.click_count} clicks</span>
          <button type="button" class="history-copy" data-url="${escapeHtml(item.short_url)}" title="Copy">⧉</button>
          <button type="button" class="history-delete" data-slug="${escapeHtml(item.slug)}" title="Delete">✕</button>
        `;
        historyList.appendChild(li);
      }
    } catch {
      historySection.hidden = true;
    }
  }

  function showResult(data: ShortUrlRecord): void {
    shortLink.href = data.short_url;
    shortLink.textContent = data.short_url;
    destinationDisplay.innerHTML = `Redirects to <strong>${escapeHtml(data.destination_url)}</strong>`;
    qrImage.src = `${qrUrl(data.slug)}?t=${Date.now()}`;
    resultStats.innerHTML = `
      <div><strong>${data.click_count}</strong> clicks</div>
      ${data.expires_at ? `<div>Expires ${new Date(data.expires_at).toLocaleString()}</div>` : ''}
      ${data.max_clicks ? `<div>Max ${data.max_clicks} clicks</div>` : ''}
      ${data.preview_enabled ? '<div>Preview enabled</div>' : ''}
    `;
    result.classList.remove('visible');
    void result.offsetWidth;
    result.classList.add('visible');
    fireConfetti(confettiCanvas);
    void renderHistory();
  }

  async function copyToClipboard(url: string, btn?: HTMLButtonElement): Promise<void> {
    await navigator.clipboard.writeText(url);
    if (btn) {
      btn.classList.add('copied');
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = original;
      }, 1500);
    }
  }

  copyBtn.addEventListener('click', () => copyToClipboard(shortLink.href, copyBtn));

  historyList.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('.history-copy')) {
      await copyToClipboard(target.dataset.url!);
      return;
    }
    if (target.matches('.history-delete')) {
      await deleteUrl(target.dataset.slug!);
      await renderHistory();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFeedback();
    setLoading(true);

    const body: Record<string, unknown> = {
      destination_url: input.value.trim(),
    };

    const customSlug = (root.querySelector<HTMLInputElement>('#custom-slug')!.value || '').trim();
    const expiresAt = root.querySelector<HTMLInputElement>('#expires-at')!.value;
    const maxClicks = root.querySelector<HTMLInputElement>('#max-clicks')!.value;
    const previewEnabled = root.querySelector<HTMLInputElement>('#preview-enabled')!.checked;

    if (customSlug) body.custom_slug = customSlug;
    if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();
    if (maxClicks) body.max_clicks = Number(maxClicks);
    if (previewEnabled) body.preview_enabled = true;

    try {
      const data = await createUrl(body);
      showResult(data);
      showFeedback('Your short link is ready to share.', 'success');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  });

  document.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.startsWith('http://') || text.startsWith('https://')) {
      input.value = text.trim();
      input.focus();
      showFeedback('URL pasted — press Shorten or ⌘/Ctrl+Enter.', 'success');
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  logoHome.addEventListener('click', () => location.reload());

  themeToggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });

  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  void renderHistory();
}

function fireConfetti(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const colors = ['#5eead4', '#818cf8', '#f472b6', '#4ade80', '#fbbf24'];
  const particles = Array.from({ length: 80 }, () => ({
    x: canvas.width / 2,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -12 - 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 3,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 12,
    life: 1,
  }));

  let frame = 0;
  function tick(): void {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rotation += p.spin;
      p.life -= 0.018;

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate((p.rotation * Math.PI) / 180);
      ctx!.globalAlpha = Math.max(p.life, 0);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }

    frame += 1;
    if (alive && frame < 120) requestAnimationFrame(tick);
    else ctx!.clearRect(0, 0, canvas.width, canvas.height);
  }

  tick();
}
