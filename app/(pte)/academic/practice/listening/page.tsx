export const dynamic = 'force-dynamic';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Clock, Headphones, Sparkles, PenLine, CheckSquare, Type, MousePointer, Ear } from "lucide-react";
import { getPteQuestionCounts } from "@/lib/db/queries/metrics";

const listeningTypes = [
  {
    id: "summarize_spoken_text",
    name: "Summarize Spoken Text",
    description: "Listen to a recording and write a summary in 50-70 words",
    time: "10 min",
    aiScored: true,
    icon: PenLine,
  },
  {
    id: "listening_mc_multiple",
    name: "Multiple Choice (Multiple)",
    description: "Listen to a recording and choose all correct answers",
    time: "40-90 sec",
    aiScored: false,
    icon: CheckSquare,
  },
  {
    id: "listening_fill_blanks",
    name: "Fill in the Blanks",
    description: "Listen to a recording and type the missing words in transcript",
    time: "30-60 sec",
    aiScored: false,
    icon: Type,
  },
  {
    id: "highlight_correct_summary",
    name: "Highlight Correct Summary",
    description: "Select the paragraph that best summarizes the recording",
    time: "30-90 sec",
    aiScored: false,
    icon: MousePointer,
  },
  {
    id: "listening_mc_single",
    name: "Multiple Choice (Single)",
    description: "Listen to a recording and choose the single best answer",
    time: "30-60 sec",
    aiScored: false,
    icon: CheckSquare,
  },
  {
    id: "select_missing_word",
    name: "Select Missing Word",
    description: "Select the missing word that completes the recording",
    time: "20-70 sec",
    aiScored: false,
    icon: Ear,
  },
  {
    id: "highlight_incorrect_words",
    name: "Highlight Incorrect Words",
    description: "Click on the words in the transcript that differ from audio",
    time: "15-50 sec",
    aiScored: false,
    icon: MousePointer,
  },
  {
    id: "write_from_dictation",
    name: "Write From Dictation",
    description: "Type the short sentence exactly as you hear it",
    time: "10-15 sec",
    aiScored: true,
    isHighValue: true,
    icon: PenLine,
  },
];

export default async function ListeningPracticePage() {
  const counts = await getPteQuestionCounts();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950 dark:to-amber-950">
            <Headphones className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Listening Practice
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Master all 8 listening question types for PTE Academic
            </p>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/academic/practice" className="hover:text-primary transition-colors">
          Practice
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium">Listening</span>
      </nav>

      {/* Question Types */}
      <div className="grid gap-3">
        {listeningTypes.map((type) => {
          const Icon = type.icon;
          const count = counts[type.id] || 0;

          return (
            <Link key={type.id} href={`/academic/practice/listening/${type.id}`}>
              <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer group border-2 ${
                type.isHighValue
                  ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/10 hover:border-orange-300'
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                      type.isHighValue
                        ? 'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50'
                        : 'bg-muted group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        type.isHighValue
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-muted-foreground group-hover:text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {type.name}
                        </h3>
                        {type.aiScored ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                            AI Scored
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                            Auto Scored
                          </Badge>
                        )}
                        {type.isHighValue && (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 hover:bg-orange-200 border-0 text-[10px] gap-0.5">
                            <Sparkles className="size-2.5" /> High Value
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                        {type.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {type.time}
                        </span>
                        <span className="font-medium">{count} questions</span>
                      </div>
                    </div>
                    <div className="size-9 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
