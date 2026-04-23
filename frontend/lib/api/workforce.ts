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

export interface ApiClient {
  id: number
  name: string
  company: string
  email: string
  contact_person: string
  phone: string
  country: string
  notes: string
  total_revenue: string
  is_active: boolean
  active_projects: number
  created_at: string
  updated_at: string
}

export interface ApiProject {
  id: number
  name: string
  client: number
  client_name: string
  status: "lead" | "active" | "finished" | "paused"
  start_date: string
  end_date: string
  billing_model: "fixed" | "time-materials"
  currency: "USD" | "EUR" | "UAH"
  total_contract_value: string | null
  client_hourly_rate: string | null
  monthly_cap: number | null
  billing_cycle: "weekly" | "biweekly" | "monthly" | null
  revenue: string
  labor_cost: string
  direct_overheads: string
  buffer_percent: string
  tax_reserve_percent: string | null
  created_at: string
  updated_at: string
}

export interface ApiSubscription {
  id: number
  client: number
  client_name: string
  project: number | null
  project_name: string
  plan_name: string
  description: string
  status: "active" | "pending" | "paused" | "cancelled" | "expired"
  amount: string
  currency: "USD" | "EUR" | "UAH"
  billing_cycle: "monthly" | "quarterly" | "semi-annual" | "yearly"
  start_date: string
  next_billing_date: string
  end_date: string | null
  hours_included: number | null
  features: string[]
  total_paid: string
  confirmed_at: string | null
  confirmed_by: string
  created_at: string
  updated_at: string
}

export interface AnalyticsMoneyFlowNode {
  id: string | number
  name: string
  amount: number
  color?: string
}

export interface ApiAnalyticsOverview {
  health: {
    total_revenue: number
    total_labor_cost: number
    monthly_recurring: number
    monthly_variable: number
    total_monthly_costs: number
    tax_reserve: number
    monthly_esv: number
    monthly_depreciation: number
    ebitda: number
    net_profit: number
    current_cash: number
    monthly_burn: number
    runway_months: number
    profit_margin: number
    sankey: {
      sources: AnalyticsMoneyFlowNode[]
      destinations: AnalyticsMoneyFlowNode[]
      total_income: number
    }
    cost_structure: Array<{
      label: string
      amount: number
      percent: number
      color: string
    }>
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

  listClients: () => apiRequest<ApiClient[]>("/api/clients/"),
  createClient: (payload: Partial<ApiClient>) =>
    apiRequest<ApiClient>("/api/clients/", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (id: string | number, payload: Partial<ApiClient>) =>
    apiRequest<ApiClient>(`/api/clients/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteClient: (id: string | number) => apiRequest<void>(`/api/clients/${id}/`, { method: "DELETE" }),

  listProjects: () => apiRequest<ApiProject[]>("/api/projects/"),
  getProject: (id: string | number) => apiRequest<ApiProject>(`/api/projects/${id}/`),
  createProject: (payload: Partial<ApiProject>) =>
    apiRequest<ApiProject>("/api/projects/", { method: "POST", body: JSON.stringify(payload) }),
  updateProject: (id: string | number, payload: Partial<ApiProject>) =>
    apiRequest<ApiProject>(`/api/projects/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProject: (id: string | number) => apiRequest<void>(`/api/projects/${id}/`, { method: "DELETE" }),

  listSubscriptions: () => apiRequest<ApiSubscription[]>("/api/subscriptions/"),
  createSubscription: (payload: Partial<ApiSubscription>) =>
    apiRequest<ApiSubscription>("/api/subscriptions/", { method: "POST", body: JSON.stringify(payload) }),
  updateSubscription: (id: string | number, payload: Partial<ApiSubscription>) =>
    apiRequest<ApiSubscription>(`/api/subscriptions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSubscription: (id: string | number) => apiRequest<void>(`/api/subscriptions/${id}/`, { method: "DELETE" }),

  getAnalyticsOverview: () => apiRequest<ApiAnalyticsOverview>("/api/analytics/overview/"),
}
