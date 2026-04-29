const THETA = [0.8, 1.2, -0.9]

export function computeBaseHalfLife(
  difficultyLevel: number,
  baseWeight: number
): number {
  // Difficulty 1 (easy) → slower decay. Difficulty 4 (hard) → faster decay.
  const difficultyFactor =
    difficultyLevel === 1 ? 8 :
    difficultyLevel === 2 ? 5 :
    difficultyLevel === 3 ? 3 :
    2

  const weightFactor = Math.max(0.5, Math.min(2.0, baseWeight / 3.5))

  return difficultyFactor * weightFactor
}

export function computeHalfLife(
  attempts: number,
  correct: number,
  incorrect: number,
  difficultyLevel: number,
  baseWeight: number
): number {
  const x = [
    Math.sqrt(attempts),
    Math.sqrt(correct),
    Math.sqrt(incorrect)
  ]

  const dot = THETA[0] * x[0] + THETA[1] * x[1] + THETA[2] * x[2]

  const baseHalfLife = computeBaseHalfLife(difficultyLevel, baseWeight)

  return baseHalfLife * Math.pow(2, dot)
}

export function computeRecallProb(
  halfLife: number,
  lastPracticed: Date | null
): number {
  if (!lastPracticed) return 1.0

  const deltaDays =
    (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)

  return Math.pow(2, -deltaDays / halfLife)
}

export function getDaysUntilThreshold(
  halfLife: number,
  lastPracticed: Date | null,
  threshold: number = 0.6
): number {
  if (!lastPracticed) return 0

  const deltaDays =
    (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)

  const tReview = halfLife * Math.log2(1 / threshold)

  return Math.max(0, tReview - deltaDays)
}

export function getStatus(
  attempts: number,
  recallProb: number
): 'new' | 'strong' | 'fading' | 'weak' | 'forgotten' {
  if (attempts === 0) return 'new'
  if (recallProb >= 0.9) return 'strong'
  if (recallProb >= 0.6) return 'fading'
  if (recallProb >= 0.4) return 'weak'
  return 'forgotten'
}

export function computeAdaptiveWeight(
  baseWeight: number,
  recentIncorrect: number,
  daysSincePractice: number
): number {
  const mistakeFactor =
    recentIncorrect === 0 ? 1.0 :
    recentIncorrect <= 2  ? 1.3 :
    recentIncorrect <= 5  ? 1.7 :
    2.2

  const forgetFactor =
    daysSincePractice === 0  ? 1.0 :
    daysSincePractice <= 2   ? 1.2 :
    daysSincePractice <= 5   ? 1.5 :
    daysSincePractice <= 10  ? 2.0 :
    2.5

  return baseWeight * mistakeFactor * forgetFactor
}

// Forgetting curve for chart rendering
// Returns array of {day, recall} points for days 0 to 30
export function forgettingCurvePoints(
  halfLife: number,
  lastPracticed: Date | null
): { day: number; recall: number }[] {
  const deltaNow = lastPracticed
    ? (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
    : 0

  return Array.from({ length: 31 }, (_, t) => ({
    day: t,
    recall: Math.round(Math.pow(2, -(deltaNow + t) / halfLife) * 100)
  }))
}
