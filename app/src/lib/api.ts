import { API_URL } from "./config";

let authToken: string | null = null;

/** Fija el token que se enviará en cada petición (lo llama el AuthProvider). */
export function setApiToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? "Error inesperado", json?.issues);
  }
  return json as T;
}
