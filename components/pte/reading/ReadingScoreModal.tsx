import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Target, TrendingUp, Lightbulb } from "lucide-react"
import { AIFeedbackData } from '@/lib/types'

interface ReadingScoreModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    feedback: AIFeedbackData | null
    onRetry: () => void
    onNext?: () => void
}

export function ReadingScoreModal({
    isOpen,
    onOpenChange,
    feedback,
    onRetry,
    onNext
}: ReadingScoreModalProps) {
    if (!feedback) return null

    const maxScore = feedback.maxScore || 0
    const score = feedback.overallScore
    const scorePercent = maxScore > 0 ? (score / maxScore) * 100 : score
    const isGoodScore = scorePercent >= 50

    // Color based on score
    const getScoreColorClass = () => {
        if (scorePercent >= 80) return 'text-green-600 dark:text-green-400'
        if (scorePercent >= 50) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
    }

    const getScoreBgClass = () => {
        if (scorePercent >= 80) return 'from-green-500 to-emerald-500'
        if (scorePercent >= 50) return 'from-yellow-500 to-amber-500'
        return 'from-red-500 to-rose-500'
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 gap-0 overflow-hidden">
                {/* Score Header */}
                <div className={`bg-gradient-to-r ${getScoreBgClass()} px-6 py-8 text-center text-white`}>
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {isGoodScore ? (
                            <CheckCircle2 className="h-8 w-8" />
                        ) : (
                            <XCircle className="h-8 w-8" />
                        )}
                        <h2 className="text-2xl font-bold">
                            {isGoodScore ? 'Well Done!' : 'Keep Practicing'}
                        </h2>
                    </div>
                    <div className="text-5xl font-bold mb-1">
                        {score}{maxScore > 0 ? `/${maxScore}` : ''}
                    </div>
                    {maxScore > 0 && (
                        <div className="text-white/80 text-sm">
                            {Math.round(scorePercent)}% correct
                        </div>
                    )}
                </div>

                <ScrollArea className="max-h-[50vh]">
                    <div className="p-6 space-y-5">
                        {/* Analysis / Suggestions */}
                        {feedback.suggestions && feedback.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                    <Lightbulb className="h-4 w-4" /> Analysis
                                </h4>
                                <ul className="space-y-2">
                                    {feedback.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Strengths</span>
                                </div>
                                {feedback.strengths?.length ? (
                                    <ul className="space-y-1">
                                        {feedback.strengths.map((s, i) => (
                                            <li key={i} className="text-sm text-green-800 dark:text-green-300">• {s}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-green-800 dark:text-green-300">Good effort!</p>
                                )}
                            </div>
                            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">To Improve</span>
                                </div>
                                {feedback.areasForImprovement?.length ? (
                                    <ul className="space-y-1">
                                        {feedback.areasForImprovement.map((a, i) => (
                                            <li key={i} className="text-sm text-amber-800 dark:text-amber-300">• {a}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-amber-800 dark:text-amber-300">Keep practicing.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="flex flex-row sm:justify-between gap-2 p-4 border-t bg-muted/5">
                    <Button variant="outline" onClick={onRetry} className="flex-1 sm:flex-none gap-2">
                        <RotateCcw className="h-4 w-4" /> Try Again
                    </Button>
                    {onNext ? (
                        <Button onClick={onNext} className="flex-1 sm:flex-none gap-2">
                            Next Question <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
