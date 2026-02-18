export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

const isJsonResponse = (response: Response) => {
  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json");
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const shouldSendJsonContentType =
    method !== "GET" &&
    method !== "HEAD" &&
    options.body !== undefined &&
    options.body !== null &&
    !isFormDataBody;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(shouldSendJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let body: unknown = undefined;
    if (isJsonResponse(response)) {
      body = await response.json();
      if (body && typeof body === "object" && "message" in body) {
        const typed = body as { message?: string | string[] };
        if (Array.isArray(typed.message)) {
          message = typed.message.join(", ");
        } else if (typed.message) {
          message = typed.message;
        }
      }
    }
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isJsonResponse(response)) {
    return (await response.json()) as T;
  }

  return undefined as T;
}
