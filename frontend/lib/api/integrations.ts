import {
  type CreateIntegrationConnectionPayload,
  type IntegrationAccountDto,
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

type BackendConnectionDto = {
  id: string
  provider: IntegrationConnectionDto["provider"]
  status: IntegrationConnectionDto["status"]
  token_masked: string | null
  last_sync: string | null
  last_error: string | null
  disabled_reason: string | null
}

function toConnectionDto(item: BackendConnectionDto): IntegrationConnectionDto {
  return {
    id: item.id,
    provider: item.provider,
    status: item.status,
    last_sync_at: item.last_sync,
    token_masked: item.token_masked,
    last_error_text: item.last_error,
    requires_reconnect: Boolean(item.disabled_reason),
    accounts: [] as IntegrationAccountDto[],
  }
}

export const integrationsApi = {
  listConnections: async () => {
    const items = await apiRequest<BackendConnectionDto[]>("/api/bank-connections/")
    return items.map(toConnectionDto)
  },
  createConnection: (payload: CreateIntegrationConnectionPayload) =>
    apiRequest<BackendConnectionDto>("/api/bank-connections/", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(toConnectionDto),
  deleteConnection: (connectionId: string) =>
    apiRequest<void>(`/api/bank-connections/${connectionId}/`, { method: "DELETE" }),
  forceSync: (connectionId: string) =>
    apiRequest<BackendConnectionDto>(`/api/bank-connections/${connectionId}/sync/`, { method: "POST" }).then(toConnectionDto),
  reconnect: (connectionId: string, payload: ReconnectIntegrationPayload) =>
    apiRequest<BackendConnectionDto>(`/api/bank-connections/${connectionId}/reconnect/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(toConnectionDto),
  updateAccountTracking: async (_accountId: string, _isTracked: boolean) => {
    // Backend account-level tracking endpoint is not available yet.
    return Promise.resolve()
  },
}
