export const dynamic = 'force-dynamic';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Clock, Mic, Sparkles, BookOpenText, Image, Repeat, MessageCircle, Users, HelpCircle } from "lucide-react";
import { getPteQuestionCounts } from "@/lib/db/queries/metrics";

const speakingTypes = [
  {
    id: "read_aloud",
    name: "Read Aloud",
    description: "Read a text aloud with correct pronunciation and fluency",
    time: "30-35 sec",
    isHighValue: true,
    icon: BookOpenText,
  },
  {
    id: "repeat_sentence",
    name: "Repeat Sentence",
    description: "Listen and repeat the sentence exactly as you hear it",
    time: "15 sec",
    isHighValue: true,
    icon: Repeat,
  },
  {
    id: "describe_image",
    name: "Describe Image",
    description: "Describe what you see in the image in detail",
    time: "40 sec",
    icon: Image,
  },
  {
    id: "retell_lecture",
    name: "Re-tell Lecture",
    description: "Listen to a lecture and retell it in your own words",
    time: "40 sec",
    icon: MessageCircle,
  },
  {
    id: "answer_short_question",
    name: "Answer Short Question",
    description: "Answer a question with a single word or short phrase",
    time: "10 sec",
    icon: HelpCircle,
  },
  {
    id: "respond_to_situation",
    name: "Respond to a Situation",
    description: "Respond appropriately to a given situation",
    time: "40 sec",
    isCore: true,
    icon: MessageCircle,
  },
  {
    id: "summarize_group_discussion",
    name: "Summarize Group Discussion",
    description: "Listen to a discussion and summarize main points",
    time: "40 sec",
    isCore: true,
    icon: Users,
  },
];

export default async function SpeakingPracticePage() {
  const counts = await getPteQuestionCounts();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950">
            <Mic className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Speaking Practice
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Master all 7 speaking question types with real-time AI feedback
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
        <span className="text-foreground font-medium">Speaking</span>
      </nav>

      {/* Question Types */}
      <div className="grid gap-3">
        {speakingTypes.map((type) => {
          const Icon = type.icon;
          const count = counts[type.id] || 0;

          return (
            <Link key={type.id} href={`/academic/practice/speaking/${type.id}`}>
              <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer group border-2 ${
                type.isHighValue
                  ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 hover:border-blue-300'
                  : 'hover:border-primary/50'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                      type.isHighValue
                        ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50'
                        : 'bg-muted group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        type.isHighValue
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground group-hover:text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {type.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                          AI Scored
                        </Badge>
                        {type.isHighValue && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 border-0 text-[10px] gap-0.5">
                            <Sparkles className="size-2.5" /> High Value
                          </Badge>
                        )}
                        {type.isCore && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-300 text-gray-500 font-medium">
                            Core
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
