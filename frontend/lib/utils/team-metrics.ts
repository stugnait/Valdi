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

export const calculateTeamMetrics = (members: TeamMember[], teamOverheads: TeamOverhead[]) => {
  const teamLaborCost = members.reduce((sum, member) => sum + calculateEmployeeBaseCost(member), 0)
  const teamOverheadShare = members.reduce(
    (sum, member) => sum + member.teamOverheadShare * (member.utilization / 100),
    0
  )
  const companyOverheadShare = members.reduce(
    (sum, member) => sum + member.companyOverheadShare * (member.utilization / 100),
    0
  )
  const teamOverheadCost = calculateTeamOverheadCost(teamOverheads)

  const burnRate = teamLaborCost + teamOverheadCost + teamOverheadShare + companyOverheadShare
  const allocatedHours = members.reduce(
    (sum, member) => sum + MONTHLY_WORK_HOURS * (member.utilization / 100),
    0
  )
  const availableHours = members.length * MONTHLY_WORK_HOURS
  const utilization = availableHours > 0 ? Math.round((allocatedHours / availableHours) * 100) : 0

  return {
    teamLaborCost,
    teamOverheadCost,
    teamOverheadShare,
    companyOverheadShare,
    burnRate,
    allocatedHours,
    availableHours,
    utilization,
  }
}
