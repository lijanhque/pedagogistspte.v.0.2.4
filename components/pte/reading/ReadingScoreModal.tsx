import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogFooter,
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

    const score = feedback.overallScore
    const maxScore = feedback.maxScore || 0

    // For deterministic reading, overallScore is on 10-90 PTE scale
    const accuracyText = feedback.accuracy?.feedback || ''
    const scorePercent = score > 0 ? ((score - 10) / 80) * 100 : 0
    const isGoodScore = scorePercent >= 50

    const getScoreBgClass = () => {
        if (scorePercent >= 80) return 'from-green-500 to-emerald-500'
        if (scorePercent >= 50) return 'from-yellow-500 to-amber-500'
        return 'from-red-500 to-rose-500'
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-md md:max-w-lg p-0 gap-0 overflow-hidden rounded-xl">
                {/* Score Header - responsive padding */}
                <div className={`bg-gradient-to-r ${getScoreBgClass()} px-4 py-6 sm:px-6 sm:py-8 text-center text-white`}>
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {isGoodScore ? (
                            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                        ) : (
                            <XCircle className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                        )}
                        <h2 className="text-xl sm:text-2xl font-bold">
                            {isGoodScore ? 'Well Done!' : 'Keep Practicing'}
                        </h2>
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold mb-1" aria-label={`Score: ${score} out of 90`}>
                        {score}<span className="text-xl sm:text-2xl text-white/70">/90</span>
                    </div>
                    {accuracyText && (
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            {accuracyText}
                        </p>
                    )}
                    {maxScore > 0 && (
                        <p className="text-white/70 text-xs mt-1">
                            {feedback.accuracy?.feedback || `Max possible: ${maxScore}`}
                        </p>
                    )}
                </div>

                <ScrollArea className="max-h-[40vh] sm:max-h-[50vh]">
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        {/* Content Feedback */}
                        {feedback.content?.feedback && (
                            <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                                <p className="text-xs sm:text-sm font-medium">{feedback.content.feedback}</p>
                            </div>
                        )}

                        {/* Suggestions */}
                        {feedback.suggestions && feedback.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> Tips
                                </h3>
                                <ul className="space-y-1.5 sm:space-y-2">
                                    {feedback.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Strengths & Improvements - stack on mobile */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                            <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                                    <span className="text-[10px] sm:text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Strengths</span>
                                </div>
                                {feedback.strengths?.length ? (
                                    <ul className="space-y-1">
                                        {feedback.strengths.map((s, i) => (
                                            <li key={i} className="text-xs sm:text-sm text-green-800 dark:text-green-300">{s}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs sm:text-sm text-green-800 dark:text-green-300">Good effort!</p>
                                )}
                            </div>
                            <div className="p-3 sm:p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                    <span className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">To Improve</span>
                                </div>
                                {feedback.areasForImprovement?.length ? (
                                    <ul className="space-y-1">
                                        {feedback.areasForImprovement.map((a, i) => (
                                            <li key={i} className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">{a}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">Keep practicing.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="flex flex-row justify-between gap-2 p-3 sm:p-4 border-t bg-muted/5">
                    <Button variant="outline" onClick={onRetry} size="sm" className="flex-1 sm:flex-none gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" /> Try Again
                    </Button>
                    {onNext ? (
                        <Button onClick={onNext} size="sm" className="flex-1 sm:flex-none gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            Next <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                        </Button>
                    ) : (
                        <Button onClick={() => onOpenChange(false)} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
