export type IntegrationProvider = "monobank" | "privat24" | "wise" | "revolut"
export type IntegrationConnectionStatus = "connected" | "syncing" | "error"

export interface IntegrationAccountDto {
  id: string
  connection_id: string
  external_id: string
  name: string
  number_masked: string
  balance: number
  currency: string
  is_tracked: boolean
  type: "personal" | "business"
}

export interface IntegrationConnectionDto {
  id: string
  provider: IntegrationProvider
  status: IntegrationConnectionStatus
  last_sync_at: string | null
  token_masked: string | null
  last_error_text: string | null
  requires_reconnect?: boolean
  accounts: IntegrationAccountDto[]
}

export interface IntegrationTransactionDto {
  id: string
  connection_id: string
  account_id: string
  external_id: string
  amount: number
  currency: string
  description: string
  occurred_at: string
  category: string | null
  raw_payload?: Record<string, unknown>
}

export interface CreateIntegrationConnectionPayload {
  provider: IntegrationProvider
  token: string
}

export interface ReconnectIntegrationPayload {
  token: string
}
