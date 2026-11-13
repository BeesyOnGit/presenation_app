// Shape of the server's `state` event (presentation_api/src/features/session/view.rs)

export type Phase = 'waiting' | 'open' | 'closed' | 'revealed' | 'intro' | 'playing' | 'heatmap' | 'leaderboard'
export type StepType = 'lobby' | 'slide' | 'poll' | 'reveal' | 'game-round' | 'leaderboard' | 'compare' | 'qna'

export interface Choice {
  id: string
  label: string
}

export interface Step {
  id: string
  type: StepType
  title: string
  body?: string
  code?: string
  theme: 'part1' | 'part2'
  phone?: string
  // host only
  notes?: string
  budgetSec?: number
  // poll / compare
  question?: string
  options?: Choice[]
  correctOptionId?: string | null
  anonymous?: boolean
  hideResults?: boolean
  beforePollId?: string
  // reveal
  pollId?: string
  // game-round (answers, patternName and explanation only arrive at the reveal)
  round?: number
  product?: string
  screenComponent?: string
  context?: string
  elements?: Choice[]
  answers?: string[][]
  maxSelections?: number
  scored?: boolean
  durationSec?: number
  patternName?: string
  explanation?: string
}

export interface PollBlock {
  answerCount: number
  counts: Record<string, number> | null
  correctOptionId: string | null
}

export interface Row {
  rank: number
  nickname: string
  score: number
  change: number
}

export interface Game {
  roundStartedAt: number | null
  roundEndsAt: number | null
  lockedCount: number
  answered?: number
  noneCount?: number
  elementCounts?: Record<string, number>
  taps?: [number, number][]
  correctPct?: number
  fooledPct?: number
  leaderboard?: Row[]
}

export interface Question {
  id: number
  text: string
  votes: number
  hidden: boolean
}

export interface GameResult {
  stepId: string
  points: number
  correct: boolean
  correctElementIds: string[]
  rank: number | null
  total: number
}

export interface Me {
  playerId: string
  nickname: string
  score: number
  rank: number | null
  total: number
  answer: string | null
  locks: string[]
  result: GameResult | null
  upvoted: number[]
}

export interface OutlineStep {
  title: string
  type: StepType
  phase: Phase | null
  budgetSec: number | null
  /** Time spent on earlier visits; the current visit is added client-side */
  spentMs: number
}

export interface HostPlayer {
  id: string
  nickname: string
  score: number
  online: boolean
}

export interface State {
  room: string
  stepIndex: number
  stepCount: number
  step: Step
  phase: Phase | null
  serverNow: number
  playerCount: number
  questions: Question[]
  highlightedQuestionId: number | null
  poll?: PollBlock
  before?: { counts: Record<string, number> }
  pollStep?: Step
  dependencyCount?: number
  game?: Game
  leaderboard?: Row[]
  lobby?: string[]
  // host only
  fullStep?: Step
  nextStep?: string | null
  players?: HostPlayer[]
  outline?: OutlineStep[]
  talkStartedAt?: number | null
  stepStartedAt?: number | null
  // player only
  me?: Me
}
