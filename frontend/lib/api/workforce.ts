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
  amount: string | number
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


export interface ApiBankConnection {
  id: number
  provider: "monobank" | "privat24" | "wise" | "revolut"
  status: "connected" | "error" | "syncing" | "disabled"
  token_masked: string
  connected_at: string
  last_sync: string | null
  last_error: string
  disabled_reason: string
  created_at: string
  updated_at: string
}

export interface ApiRecurringExpense {
  id: number
  name: string
  amount: string | number
  currency: "USD" | "EUR" | "UAH"
  cycle: "monthly" | "quarterly" | "yearly"
  category: string
  source: "monobank" | "privat24" | "cash" | "wise" | "payoneer"
  allocation_type: "all" | "team" | "project" | "none"
  team: number | null
  team_name: string
  project: number | null
  project_name: string
  status: "paid" | "pending" | "overdue"
  next_payment_date: string
  last_paid_date: string | null
  description: string
  created_at: string
  updated_at: string
}

export interface ApiVariableExpense {
  id: number
  name: string
  amount: string | number
  currency: "USD" | "EUR" | "UAH"
  category: string
  source: "monobank" | "privat24" | "cash" | "wise" | "payoneer"
  expense_date: string
  assignee: number | null
  assignee_name: string
  receipt_url: string
  description: string
  allocation_type: "all" | "team" | "project" | "none"
  team: number | null
  team_name: string
  project: number | null
  project_name: string
  created_at: string
  updated_at: string
}

export interface ApiAutomationRule {
  id: number
  name: string
  is_active: boolean
  conditions: unknown[]
  actions: Record<string, unknown>
  match_count: number
  last_match_date: string | null
  created_at: string
  updated_at: string
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

  listBankConnections: () => apiRequest<ApiBankConnection[]>("/api/bank-connections/"),
  connectBank: (payload: { provider: ApiBankConnection['provider']; token: string }) =>
    apiRequest<ApiBankConnection>("/api/bank-connections/", { method: "POST", body: JSON.stringify(payload) }),
  deleteBankConnection: (id: string | number) => apiRequest<void>(`/api/bank-connections/${id}/`, { method: "DELETE" }),

  listRecurringExpenses: () => apiRequest<ApiRecurringExpense[]>("/api/recurring-expenses/"),
  createRecurringExpense: (payload: Partial<ApiRecurringExpense>) =>
    apiRequest<ApiRecurringExpense>("/api/recurring-expenses/", { method: "POST", body: JSON.stringify(payload) }),
  updateRecurringExpense: (id: string | number, payload: Partial<ApiRecurringExpense>) =>
    apiRequest<ApiRecurringExpense>(`/api/recurring-expenses/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteRecurringExpense: (id: string | number) => apiRequest<void>(`/api/recurring-expenses/${id}/`, { method: "DELETE" }),

  listVariableExpenses: () => apiRequest<ApiVariableExpense[]>("/api/variable-expenses/"),
  createVariableExpense: (payload: Partial<ApiVariableExpense>) =>
    apiRequest<ApiVariableExpense>("/api/variable-expenses/", { method: "POST", body: JSON.stringify(payload) }),
  updateVariableExpense: (id: string | number, payload: Partial<ApiVariableExpense>) =>
    apiRequest<ApiVariableExpense>(`/api/variable-expenses/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteVariableExpense: (id: string | number) => apiRequest<void>(`/api/variable-expenses/${id}/`, { method: "DELETE" }),

  listAutomationRules: () => apiRequest<ApiAutomationRule[]>("/api/automation-rules/"),
  createAutomationRule: (payload: Partial<ApiAutomationRule>) =>
    apiRequest<ApiAutomationRule>("/api/automation-rules/", { method: "POST", body: JSON.stringify(payload) }),
  updateAutomationRule: (id: string | number, payload: Partial<ApiAutomationRule>) =>
    apiRequest<ApiAutomationRule>(`/api/automation-rules/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAutomationRule: (id: string | number) => apiRequest<void>(`/api/automation-rules/${id}/`, { method: "DELETE" }),
}
