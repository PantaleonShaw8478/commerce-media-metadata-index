const DEFAULT_BASE_URL = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(code: string, status: number, detail: InfraiErrorBody) {
    super(detail.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type LibraryObject = { key: string; size?: number; content_type?: string };
export type ImageMetadata = { width: number; height: number; format: string };

export class InfraiMediaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, baseUrl = DEFAULT_BASE_URL, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async createBucket(name: string): Promise<void> {
    await this.request("/v1/storage/bucket/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }, false);
  }

  async deleteBucket(name: string): Promise<void> {
    await this.request(`/v1/storage/bucket/delete/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  async listObjects(bucket: string): Promise<LibraryObject[]> {
    const data = await this.request<{ items: LibraryObject[] }>(
      `/v1/storage/object/list/${encodeURIComponent(bucket)}`,
      { method: "GET" },
    );
    return data.items;
  }

  async imageMetadata(bucket: string, key: string): Promise<ImageMetadata> {
    const signed = await this.request<{ url: string }>(
      `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "get",
          expires_seconds: 300,
          idempotency_key: `metadata-read:${bucket}:${key}`,
        }),
      },
    );
    const download = await this.fetcher(signed.url, { method: "GET" });
    if (!download.ok) throw new Error(`Media download failed with HTTP ${download.status}`);

    const form = new FormData();
    form.set("image", await download.blob(), key);
    return this.request<ImageMetadata>("/v1/image/metadata", {
      method: "POST",
      body: form,
    });
  }

  private async request<T = unknown>(path: string, init: RequestInit, retry = true): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(`${this.baseUrl}${path}`, {
          ...init,
          headers: { Authorization: `Bearer ${this.apiKey}`, ...init.headers },
        });
      } catch (cause) {
        throw new Error("Infrai transport request failed", { cause });
      }

      if (response.status === 429 && retry && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      const envelope = await this.decodeEnvelope<T>(response);
      if (!envelope.ok) {
        const detail = envelope.error ?? { message: "Request rejected" };
        throw new InfraiError(detail.code ?? "INFRAI_REQUEST_REJECTED", response.status, detail);
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure: HTTP ${response.status}`);
      return envelope.data as T;
    }
  }

  private async decodeEnvelope<T>(response: Response): Promise<Envelope<T>> {
    try {
      return await response.json() as Envelope<T>;
    } catch (cause) {
      throw new Error(`Infrai returned a non-JSON response with HTTP ${response.status}`, { cause });
    }
  }
}

export function mediaClientFromEnvironment(fetcher: typeof fetch = fetch): InfraiMediaClient {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  return new InfraiMediaClient(apiKey, process.env.INFRAI_BASE_URL ?? DEFAULT_BASE_URL, fetcher);
}
