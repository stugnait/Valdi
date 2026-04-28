import { type TeamMember, type TeamOverhead } from "@/lib/types/teams"

export const WORK_HOURS_PER_DAY = 8
export const WORK_DAYS_PER_MONTH = 20
export const MONTHLY_WORK_HOURS = WORK_HOURS_PER_DAY * WORK_DAYS_PER_MONTH

const toMonthlyOverheadCost = (overhead: TeamOverhead) => {
  if (overhead.frequency === "yearly") return overhead.amount / 12
  return overhead.amount
}

const toMonthlySalary = (member: TeamMember) =>
  member.rateType === "hourly" ? member.baseRate * MONTHLY_WORK_HOURS : member.baseRate

export const calculateEmployeeBaseCost = (member: TeamMember) =>
  toMonthlySalary(member) * (member.utilization / 100)

export const calculateTeamOverheadCost = (overheads: TeamOverhead[]) =>
  overheads.reduce((sum, overhead) => sum + toMonthlyOverheadCost(overhead), 0)

export const calculateTeamMetrics = (
  members: TeamMember[],
  teamOverheads: TeamOverhead[],
  companyOverheadCost = 0
) => {
  const baseCosts = members.map((member) => calculateEmployeeBaseCost(member))
  const teamLaborCost = baseCosts.reduce((sum, baseCost) => sum + baseCost, 0)
  const teamOverheadCost = calculateTeamOverheadCost(teamOverheads)
  const memberCostById = new Map<string, {
    baseCost: number
    teamOverheadShare: number
    companyOverheadShare: number
    totalCost: number
    share: number
  }>()

  members.forEach((member, index) => {
    const baseCost = baseCosts[index] ?? 0
    const share = teamLaborCost > 0 ? baseCost / teamLaborCost : 0
    const teamOverheadShare = teamOverheadCost * share
    const companyOverheadShare = companyOverheadCost * share
    const totalCost = baseCost + teamOverheadShare + companyOverheadShare

    memberCostById.set(member.id, {
      baseCost,
      share,
      teamOverheadShare,
      companyOverheadShare,
      totalCost,
    })
  })

  const burnRate = Array.from(memberCostById.values()).reduce((sum, memberCost) => sum + memberCost.totalCost, 0)
  const allocatedHours = members.reduce(
    (sum, member) => sum + MONTHLY_WORK_HOURS * (member.utilization / 100),
    0
  )
  const availableHours = members.length * MONTHLY_WORK_HOURS
  const utilization = availableHours > 0 ? Math.round((allocatedHours / availableHours) * 100) : 0

  return {
    teamLaborCost,
    teamOverheadCost,
    companyOverheadCost,
    burnRate,
    allocatedHours,
    availableHours,
    utilization,
    memberCostById,
  }
}
