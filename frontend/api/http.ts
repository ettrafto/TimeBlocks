// frontend/api/http.ts

const BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE?.replace(/\/+$/,"") || "http://localhost:8080";

export type HttpOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  // optional correlation id for log stitching
  cid?: string;
};

const newCid = (pfx = "fe") =>
  `${pfx}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;

const DEV = typeof window !== "undefined" && (import.meta as any)?.env?.DEV;
export async function http<T = any>(path: string, opts: HttpOptions = {}): Promise<T> {
  const cid = opts.cid ?? newCid("api");
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (DEV) console.groupCollapsed(`⇢ ${opts.method || "GET"} ${url} [${cid}]`);
  try {
    const headers: Record<string,string> = {
      "Content-Type": "application/json",
      "X-Correlation-Id": cid,
      ...(opts.headers || {})
    };
    const init: RequestInit = { method: opts.method || "GET", headers, signal: opts.signal };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
    if (DEV) console.log("payload", opts.body);

    const res = await fetch(url, init);
    const text = await res.text();
    const json = text ? safeJson(text) : null;

    if (DEV) console.log("status", res.status, "json", json);
    if (!res.ok) throw { status: res.status, message: (json && (json.message || json.error)) || res.statusText, data: json, cid };
    return json as T;
  } finally {
    if (DEV) console.groupEnd();
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); }
  catch { return { raw: s }; }
}


