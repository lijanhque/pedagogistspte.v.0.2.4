'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AIFeedbackData, QuestionType } from '@/lib/types'
import { CheckCircle, AlertCircle, Lightbulb, RotateCcw } from 'lucide-react'

interface FeedbackCardProps {
  feedback: AIFeedbackData
  questionType: string | QuestionType
  onRetry?: () => void
  onClose?: () => void
}

export function FeedbackCard({ feedback, questionType, onRetry }: FeedbackCardProps) {
  const maxScore = feedback.maxScore || 90
  const scorePercent = (feedback.overallScore / maxScore) * 100

  const getScoreColor = (score: number, max: number = 90) => {
    const pct = (score / max) * 100
    if (pct >= 70) return 'text-green-600 dark:text-green-400'
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = () => {
    if (scorePercent >= 70) return 'from-green-500 to-emerald-500'
    if (scorePercent >= 50) return 'from-yellow-500 to-amber-500'
    return 'from-red-500 to-rose-500'
  }

  const getProgressColor = () => {
    if (scorePercent >= 70) return 'bg-green-500'
    if (scorePercent >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const scoreCategories = [
    { key: 'content', label: 'Content', data: feedback.content },
    { key: 'pronunciation', label: 'Pronunciation', data: feedback.pronunciation },
    { key: 'fluency', label: 'Fluency', data: feedback.fluency },
    { key: 'grammar', label: 'Grammar', data: feedback.grammar },
    { key: 'vocabulary', label: 'Vocabulary', data: feedback.vocabulary },
    { key: 'spelling', label: 'Spelling', data: feedback.spelling },
  ].filter(c => c.data)

  return (
    <Card className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Score Header */}
      <div className={`bg-gradient-to-r ${getScoreBg()} px-6 py-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium mb-1">Your Score</p>
            <div className="text-4xl font-bold">{feedback.overallScore}/{maxScore}</div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{Math.round(scorePercent)}%</div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Score Breakdown */}
        {scoreCategories.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Score Breakdown</h4>
            <div className="grid gap-3">
              {scoreCategories.map(({ key, label, data }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className={`font-bold ${getScoreColor(data!.score)}`}>
                      {data!.score}/{maxScore}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getProgressColor()}`}
                      style={{ width: `${(data!.score / maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Feedback */}
        <div className="space-y-3">
          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20">
              <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-semibold text-sm">
                <CheckCircle className="h-4 w-4" /> Strengths
              </div>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-300">
                {feedback.strengths.map((strength, i) => (
                  <li key={i}>• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {feedback.areasForImprovement && feedback.areasForImprovement.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20">
              <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                <AlertCircle className="h-4 w-4" /> Areas to Improve
              </div>
              <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                {feedback.areasForImprovement.map((area, i) => (
                  <li key={i}>• {area}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20">
              <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                <Lightbulb className="h-4 w-4" /> Tips
              </div>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                {feedback.suggestions.map((suggestion, i) => (
                  <li key={i}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Transcript if available */}
        {feedback.transcript && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="font-semibold text-sm mb-2">Transcript</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feedback.transcript}
            </p>
          </div>
        )}

        {/* Retry Button */}
        {onRetry && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
