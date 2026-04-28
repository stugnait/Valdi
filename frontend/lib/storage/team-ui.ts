export interface StoredTeamUiMeta {
  color?: string
}

export interface StoredMemberUiData {
  teamOverheadShare?: number
  companyOverheadShare?: number
  skills?: Array<{ id: string; name: string; color: string }>
}

export interface StoredTeamOverhead {
  id: string
  name: string
  amount: number
  frequency: "monthly" | "yearly" | "one-time"
  category: string
}

const TEAM_META_KEY = "valdi.teamUiMeta"
const MEMBER_UI_KEY = "valdi.memberUiData"
const TEAM_OVERHEADS_KEY = "valdi.teamOverheads"
const TEAM_MEMBER_JOIN_DATES_KEY = "valdi.teamMemberJoinDates"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getTeamUiMetaMap(): Record<string, StoredTeamUiMeta> {
  return readJson<Record<string, StoredTeamUiMeta>>(TEAM_META_KEY, {})
}

export function getTeamUiMeta(teamId: string): StoredTeamUiMeta {
  const map = getTeamUiMetaMap()
  return map[teamId] ?? {}
}

export function setTeamUiMeta(teamId: string, patch: StoredTeamUiMeta) {
  const map = getTeamUiMetaMap()
  map[teamId] = { ...(map[teamId] ?? {}), ...patch }
  writeJson(TEAM_META_KEY, map)
}

export function deleteTeamUiMeta(teamId: string) {
  const map = getTeamUiMetaMap()
  delete map[teamId]
  writeJson(TEAM_META_KEY, map)
}

export function getMemberUiDataMap(): Record<string, StoredMemberUiData> {
  return readJson<Record<string, StoredMemberUiData>>(MEMBER_UI_KEY, {})
}

export function getMemberUiData(memberId: string): StoredMemberUiData {
  const map = getMemberUiDataMap()
  return map[memberId] ?? {}
}

export function setMemberUiData(memberId: string, patch: StoredMemberUiData) {
  const map = getMemberUiDataMap()
  map[memberId] = { ...(map[memberId] ?? {}), ...patch }
  writeJson(MEMBER_UI_KEY, map)
}

export function deleteMemberUiData(memberId: string) {
  const map = getMemberUiDataMap()
  delete map[memberId]
  writeJson(MEMBER_UI_KEY, map)
}

export function getTeamOverheadsMap(): Record<string, StoredTeamOverhead[]> {
  return readJson<Record<string, StoredTeamOverhead[]>>(TEAM_OVERHEADS_KEY, {})
}

export function getTeamOverheads(teamId: string): StoredTeamOverhead[] {
  const map = getTeamOverheadsMap()
  return map[teamId] ?? []
}

export function setTeamOverheads(teamId: string, overheads: StoredTeamOverhead[]) {
  const map = getTeamOverheadsMap()
  map[teamId] = overheads
  writeJson(TEAM_OVERHEADS_KEY, map)
}

export function getTeamMemberJoinDate(teamId: string, memberId: string): string | null {
  const map = readJson<Record<string, string>>(TEAM_MEMBER_JOIN_DATES_KEY, {})
  return map[`${teamId}:${memberId}`] ?? null
}

export function setTeamMemberJoinDate(teamId: string, memberId: string, joinDate: string) {
  const map = readJson<Record<string, string>>(TEAM_MEMBER_JOIN_DATES_KEY, {})
  map[`${teamId}:${memberId}`] = joinDate
  writeJson(TEAM_MEMBER_JOIN_DATES_KEY, map)
}
