const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

export interface ApiMembership {
  id?: number
  developer: number
  developer_name?: string
  developer_email?: string
  allocation: number
}

export interface ApiTeam {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
  memberships: ApiMembership[]
}

export interface ApiDeveloperTeam {
  id: number
  name: string
  allocation: number
}

export interface ApiDeveloper {
  id: number
  full_name: string
  email: string
  role: string
  hourly_rate: string
  is_active: boolean
  created_at: string
  updated_at: string
  teams: ApiDeveloperTeam[]
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
      const payload = (await response.json()) as { detail?: string }
      throw new Error(payload.detail || `API request failed: ${response.status}`)
    }

    const text = await response.text()
    throw new Error(text || `API request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const workforceApi = {
  listTeams: () => apiRequest<ApiTeam[]>("/api/teams/"),
  getTeam: (id: string | number) => apiRequest<ApiTeam>(`/api/teams/${id}/`),
  createTeam: (payload: Partial<ApiTeam>) =>
    apiRequest<ApiTeam>("/api/teams/", { method: "POST", body: JSON.stringify(payload) }),
  updateTeam: (id: string | number, payload: Partial<ApiTeam>) =>
    apiRequest<ApiTeam>(`/api/teams/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTeam: (id: string | number) => apiRequest<void>(`/api/teams/${id}/`, { method: "DELETE" }),

  listDevelopers: () => apiRequest<ApiDeveloper[]>("/api/developers/"),
  createDeveloper: (payload: {
    full_name: string
    email: string
    role: string
    hourly_rate: number
    is_active?: boolean
  }) => apiRequest<ApiDeveloper>("/api/developers/", { method: "POST", body: JSON.stringify(payload) }),
  updateDeveloper: (
    id: string | number,
    payload: Partial<{
      full_name: string
      email: string
      role: string
      hourly_rate: number
      is_active: boolean
    }>
  ) => apiRequest<ApiDeveloper>(`/api/developers/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteDeveloper: (id: string | number) => apiRequest<void>(`/api/developers/${id}/`, { method: "DELETE" }),
}
