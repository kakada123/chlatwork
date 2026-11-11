export type RosterEntryStatus = 'DRAFT' | 'REQUESTED' | 'CONFIRMED' | 'CANCELLED'
export type LeaveCode = 'PRD' | 'PHL' | 'AL' | 'H1' | 'H2'
export type LeaveTransactionKind = 'OPENING_BALANCE' | 'EARNED' | 'ADJUSTMENT' | 'DEDUCTION' | 'REVERSAL'

export interface RosterShift {
  id: string
  code: string
  startTime: string   // HH:MM
  endTime: string     // HH:MM
  isOvernight: boolean
  isDefault: boolean
  isActive: boolean
}

export interface RosterDay {
  id: string
  entryDate: string   // YYYY-MM-DD
  shiftCode: string | null
  leaveCode: LeaveCode | null
  status: RosterEntryStatus
  note: string | null
  isLocked: boolean
  shift?: RosterShift | null
}

export interface RosterPreferences {
  saturdayOff: boolean
  sundayOff: boolean
  publicHolidaysOff: boolean
  defaultShiftCode: string | null
  monthlyPrdAllowance: number
  timezone: string
  displayName: string | null
  leavePriority: LeaveCode[]
}

export interface LeaveBalance {
  leaveCode: LeaveCode
  leaveYear: number
  openingBalanceHalfDays: number
  earnedHalfDays: number
  adjustmentHalfDays: number
  confirmedUsedHalfDays: number
  pendingHalfDays: number
  // Computed client-side — do NOT rely on backend for these
  totalHalfDays: number         // opening + earned + adjustment
  availableHalfDays: number     // total - confirmedUsed - pending
}

export interface LeaveTransaction {
  id: string
  leaveCode: LeaveCode
  kind: LeaveTransactionKind
  halfDays: number
  note: string | null
  createdAt: string
  rosterDayId: string | null
}

export interface RosterSettings {
  preferences: RosterPreferences
  shifts: RosterShift[]
  balances: LeaveBalance[]
}

export interface RosterGeneratePreview {
  suggestions: Array<{
    entryDate: string
    shiftCode: string | null
    leaveCode: LeaveCode | null
    reason: string
  }>
  warnings: string[]
}

export interface MonthlyRosterSummary {
  totalDays: number
  workingDays: number
  prdUsed: number
  prdAllowance: number
  prdRemaining: number
  phlUsed: number
  phlRemaining: number
  alUsed: number
  alRemaining: number
  halfDaysCount: number
  pendingRequests: number
  unassignedDays: number
}

// Leave code display config used by UI components
export const LEAVE_CODE_CONFIG: Record<LeaveCode, { label: string; color: string; halfDays: number }> = {
  PRD: { label: 'PRD', color: '#ef4444', halfDays: 2 },
  PHL: { label: 'PHL', color: '#eab308', halfDays: 2 },
  AL:  { label: 'AL',  color: '#8b5cf6', halfDays: 2 },
  H1:  { label: 'H1',  color: '#a78bfa', halfDays: 1 },
  H2:  { label: 'H2',  color: '#a78bfa', halfDays: 1 },
}
