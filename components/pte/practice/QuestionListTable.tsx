'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock, Play, CheckCircle2, Clock, Hash } from 'lucide-react'
import { PracticeQuestion } from '@/lib/types'

interface QuestionTypeInfo {
  name: string
  description: string | null
  timeLimit?: number | null
}

interface QuestionListTableProps {
  questionType: QuestionTypeInfo
  questions: PracticeQuestion[]
  basePath: string
  backLink: string
  title: string
}

export default function QuestionListTable({
  questionType,
  questions,
  basePath,
  backLink,
  title,
}: QuestionListTableProps) {
  const completedCount = questions.filter(q => q.userStatus === 'completed').length

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href={backLink}
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors w-fit gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {title}
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {questionType.name}
          </h1>
          {questionType.description && (
            <p className="text-muted-foreground text-sm">{questionType.description}</p>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{questions.length}</span>
          <span className="text-muted-foreground">questions</span>
        </div>
        {questionType.timeLimit && (
          <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{Math.floor(questionType.timeLimit / 60)} min</span>
            <span className="text-muted-foreground">per question</span>
          </div>
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-400">{completedCount}/{questions.length}</span>
            <span className="text-green-600/70 dark:text-green-400/70">completed</span>
          </div>
        )}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-xl border-2 border-dashed">
          <p className="text-muted-foreground font-medium">
            No questions available for this type yet.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Check back later for new questions.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {questions.map((q, index) => {
            const isCompleted = q.userStatus === 'completed'
            const number = questions.length - index

            return (
              <Link key={q.id} href={`${basePath}/${q.id}`}>
                <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer group border-2 ${
                  isCompleted
                    ? 'border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10'
                    : 'hover:border-primary/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Number */}
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold shrink-0 ${
                        isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : number}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm group-hover:text-primary transition-colors">
                            {q.title || `Question ${number}`}
                          </span>
                          {q.isPremium && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 font-medium">
                              <Lock className="h-2.5 w-2.5" /> VIP
                            </Badge>
                          )}
                          <Badge
                            variant={
                              q.difficulty === 'Hard'
                                ? 'destructive'
                                : q.difficulty === 'Medium'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-[10px] px-1.5 py-0 font-medium"
                          >
                            {q.difficulty}
                          </Badge>
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className="gap-1.5 shrink-0"
                      >
                        <Play className="h-3 w-3" />
                        {isCompleted ? 'Retry' : 'Start'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
