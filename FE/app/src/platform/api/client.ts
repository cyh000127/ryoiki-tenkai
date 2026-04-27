export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
}

export function getWebSocketUrl(token: string): string {
  const apiBaseUrl = new URL(getApiBaseUrl());
  apiBaseUrl.protocol = apiBaseUrl.protocol === "https:" ? "wss:" : "ws:";
  apiBaseUrl.pathname = "/ws";
  apiBaseUrl.search = "";
  apiBaseUrl.searchParams.set("token", token);
  return apiBaseUrl.toString();
}
