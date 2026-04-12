export const dynamic = 'force-dynamic';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen, CheckSquare, Sparkles, GripVertical, ChevronDown, MousePointer } from "lucide-react";
import { getPteQuestionCounts } from "@/lib/db/queries/metrics";

const readingTypes = [
  {
    id: "reading_mc_single",
    name: "Multiple Choice (Single Answer)",
    description: "Read a passage and select the correct answer from options",
    time: "2 min",
    icon: CheckSquare,
    color: "purple",
  },
  {
    id: "reading_mc_multiple",
    name: "Multiple Choice (Multiple Answers)",
    description: "Read a passage and select all correct answers",
    time: "2 min",
    icon: CheckSquare,
    color: "purple",
  },
  {
    id: "reorder_paragraphs",
    name: "Re-order Paragraphs",
    description: "Arrange paragraphs in the correct logical order",
    time: "2-3 min",
    icon: GripVertical,
    color: "indigo",
    isHighValue: true,
  },
  {
    id: "reading_fill_blanks_dropdown",
    name: "Reading & Writing: Fill in the Blanks",
    description: "Select the correct word from dropdown options to complete the passage",
    time: "2 min",
    icon: ChevronDown,
    color: "blue",
    isHighValue: true,
  },
  {
    id: "reading_fill_blanks_drag",
    name: "Fill in the Blanks (Drag & Drop)",
    description: "Drag words from a word bank to fill the blanks in the passage",
    time: "2 min",
    icon: MousePointer,
    color: "blue",
  },
];

export default async function ReadingPracticePage() {
  const counts = await getPteQuestionCounts();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950 dark:to-indigo-950">
            <BookOpen className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reading Practice
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Master all 5 reading question types for PTE Academic
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
        <span className="text-foreground font-medium">Reading</span>
      </nav>

      {/* Question Types */}
      <div className="grid gap-3">
        {readingTypes.map((type) => {
          const Icon = type.icon;
          const count = counts[type.id] || 0;

          return (
            <Link key={type.id} href={`/academic/practice/reading/${type.id}`}>
              <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer group border-2 ${
                type.isHighValue
                  ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 hover:border-purple-300'
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                      type.isHighValue
                        ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50'
                        : 'bg-muted group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        type.isHighValue
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-muted-foreground group-hover:text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {type.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                          Auto Scored
                        </Badge>
                        {type.isHighValue && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 border-0 text-[10px] gap-0.5">
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
