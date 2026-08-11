export interface ShortUrlRecord {
  id: string;
  slug: string;
  short_url: string;
  destination_url: string;
  created_at: string;
  expires_at: string | null;
  max_clicks: number | null;
  click_count: number;
  preview_enabled: boolean;
}

export interface ApiError {
  error: string;
  message: string;
}

export async function createUrl(body: Record<string, unknown>): Promise<ShortUrlRecord> {
  const res = await fetch('/v1/urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export async function listUrls(): Promise<ShortUrlRecord[]> {
  const res = await fetch('/v1/urls');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data.items;
}

export async function deleteUrl(slug: string): Promise<void> {
  const res = await fetch(`/v1/urls/${slug}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data.message || 'Delete failed');
  }
}

export function qrUrl(slug: string): string {
  return `/v1/urls/${slug}/qr`;
}

export function exportUrl(format: 'json' | 'csv'): string {
  return `/v1/urls/export?format=${format}`;
}
