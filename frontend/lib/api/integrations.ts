import {
  type CreateIntegrationConnectionPayload,
  type IntegrationConnectionDto,
  type ReconnectIntegrationPayload,
} from "@/lib/types/integrations"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function getAccessToken() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("access_token") ?? ""
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { detail?: string; message?: string }
      throw new ApiError(response.status, payload.detail ?? payload.message ?? `API request failed: ${response.status}`)
    }

    const text = await response.text()
    throw new ApiError(response.status, text || `API request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const integrationsApi = {
  listConnections: () => apiRequest<IntegrationConnectionDto[]>("/api/integrations/connections/"),
  createConnection: (payload: CreateIntegrationConnectionPayload) =>
    apiRequest<IntegrationConnectionDto>("/api/integrations/connections/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteConnection: (connectionId: string) =>
    apiRequest<void>(`/api/integrations/connections/${connectionId}/`, { method: "DELETE" }),
  forceSync: (connectionId: string) =>
    apiRequest<IntegrationConnectionDto>(`/api/integrations/connections/${connectionId}/sync/`, { method: "POST" }),
  reconnect: (connectionId: string, payload: ReconnectIntegrationPayload) =>
    apiRequest<IntegrationConnectionDto>(`/api/integrations/connections/${connectionId}/reconnect/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAccountTracking: (accountId: string, isTracked: boolean) =>
    apiRequest<void>(`/api/integrations/accounts/${accountId}/tracking/`, {
      method: "PATCH",
      body: JSON.stringify({ is_tracked: isTracked }),
    }),
}
