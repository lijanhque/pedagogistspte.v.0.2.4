"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Pause, Volume2, Ear, Send, RotateCcw, ArrowLeft, Headphones, Check } from "lucide-react";
import { QuestionType, AIFeedbackData } from "@/lib/types";
import { scoreListeningAttempt } from "@/app/actions/pte";
import { CountdownTimer } from "@/components/pte/timers/CountdownTimer";
import { FeedbackCard } from "@/components/pte/feedback/FeedbackCard";
import { ListeningFillBlanks } from "./ListeningFillBlanks";
import { HighlightIncorrectWords } from "./HighlightIncorrectWords";

interface ListeningPracticeClientProps {
  questionId: string;
  questionType: string | QuestionType;
  content: string;
  audioUrl?: string;
  transcript?: string;
  options?: string[];
  timeLimit?: number;
}

export function ListeningPracticeClient({
  questionId,
  questionType,
  content,
  audioUrl,
  transcript,
  options = [],
  timeLimit = 600,
}: ListeningPracticeClientProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedbackData | null>(null);

  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Answer States
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [filledBlanks, setFilledBlanks] = useState<Record<string, string>>({});
  const [highlightedWords, setHighlightedWords] = useState<number[]>([]);

  // Handle Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoaded = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const userResponse = {
        text: textAnswer,
        selectedOption,
        selectedOptions,
        filledBlanks,
        highlightedWords,
      };

      const result = await scoreListeningAttempt(
        questionType as any,
        content,
        questionId,
        options,
        undefined,
        transcript,
        null,
        userResponse
      );

      if (result.success && result.feedback) {
        setFeedback(result.feedback);
        toast({
          title: "Scoring Complete",
          description: `Your score: ${result.feedback.overallScore}${result.feedback.maxScore ? `/${result.feedback.maxScore}` : '/90'}`,
        });
      } else {
        throw new Error(result.error || "Scoring failed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    setTextAnswer("");
    setSelectedOption("");
    setSelectedOptions([]);
    setFilledBlanks({});
    setHighlightedWords([]);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const getInstruction = () => {
    switch (questionType) {
      case QuestionType.SUMMARIZE_SPOKEN_TEXT:
      case "summarize_spoken_text":
        return "Listen to the recording and write a summary in 50–70 words.";
      case QuestionType.WRITE_FROM_DICTATION:
      case "write_from_dictation":
        return "Listen carefully and type the sentence you hear exactly as spoken.";
      case QuestionType.LISTENING_MULTIPLE_CHOICE_SINGLE:
      case "listening_mc_single":
      case "multiple_choice_single":
        return "Listen to the recording and choose the best answer from the options below.";
      case QuestionType.HIGHLIGHT_CORRECT_SUMMARY:
      case "highlight_correct_summary":
        return "Listen to the recording and select the paragraph that best summarises it.";
      case QuestionType.SELECT_MISSING_WORD:
      case "select_missing_word":
        return "Listen to the recording and select the word that completes the sentence.";
      case QuestionType.LISTENING_MULTIPLE_CHOICE_MULTIPLE:
      case "listening_mc_multiple":
      case "multiple_choice_multiple":
        return "Listen to the recording and choose all options that apply.";
      case QuestionType.LISTENING_BLANKS:
      case "fill_blanks":
        return "Listen to the recording and type the missing words into the gaps.";
      case QuestionType.HIGHLIGHT_INCORRECT_WORDS:
      case "highlight_incorrect_words":
        return "Click on the words in the text that differ from what you hear in the recording.";
      default:
        return null;
    }
  };

  const hasAnswer = () => {
    return (
      textAnswer.trim().length > 0 ||
      selectedOption.length > 0 ||
      selectedOptions.length > 0 ||
      Object.keys(filledBlanks).length > 0 ||
      highlightedWords.length > 0
    );
  };

  const renderInputArea = () => {
    const instruction = getInstruction();

    switch (questionType) {
      case QuestionType.SUMMARIZE_SPOKEN_TEXT:
      case "summarize_spoken_text":
      case QuestionType.WRITE_FROM_DICTATION:
      case "write_from_dictation":
        return (
          <div className="space-y-4">
            {instruction && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{instruction}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium mb-2 block">Your Answer</Label>
              <Textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your response here..."
                className="min-h-[180px] text-base leading-relaxed resize-y border-2 focus:border-primary"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {String(questionType) === "summarize_spoken_text" || questionType === QuestionType.SUMMARIZE_SPOKEN_TEXT
                    ? "Target: 50–70 words"
                    : "Type what you heard"}
                </span>
                <span className="font-mono">
                  {textAnswer.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>
          </div>
        );

      case QuestionType.LISTENING_MULTIPLE_CHOICE_SINGLE:
      case "listening_mc_single":
      case "multiple_choice_single":
      case QuestionType.HIGHLIGHT_CORRECT_SUMMARY:
      case "highlight_correct_summary":
      case QuestionType.SELECT_MISSING_WORD:
      case "select_missing_word":
        return (
          <div className="space-y-4">
            {instruction && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{instruction}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">Choose the best answer</p>
            <RadioGroup
              value={selectedOption}
              onValueChange={setSelectedOption}
              className="space-y-2.5"
            >
              {options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                return (
                  <label
                    key={idx}
                    htmlFor={`opt-${idx}`}
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {optionLetters[idx]}
                    </div>
                    <span className="flex-1 text-sm leading-relaxed pt-0.5">{opt}</span>
                    <RadioGroupItem value={opt} id={`opt-${idx}`} className="shrink-0 mt-0.5" />
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        );

      case QuestionType.LISTENING_MULTIPLE_CHOICE_MULTIPLE:
      case "listening_mc_multiple":
      case "multiple_choice_multiple":
        return (
          <div className="space-y-4">
            {instruction && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{instruction}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Select all that apply ({selectedOptions.length} selected)
            </p>
            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const isSelected = selectedOptions.includes(opt);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedOptions(selectedOptions.filter((o) => o !== opt));
                      } else {
                        setSelectedOptions([...selectedOptions, opt]);
                      }
                    }}
                    className={`flex items-start gap-3 w-full rounded-lg border-2 p-4 text-left transition-all duration-200 hover:shadow-sm ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isSelected ? <Check className="h-4 w-4" /> : optionLetters[idx]}
                    </div>
                    <span className="text-sm leading-relaxed pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case QuestionType.LISTENING_BLANKS:
      case "fill_blanks":
        return (
          <div className="space-y-4">
            {instruction && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{instruction}</p>
              </div>
            )}
            <ListeningFillBlanks
              transcript={content}
              value={filledBlanks}
              onChange={setFilledBlanks}
            />
          </div>
        );

      case QuestionType.HIGHLIGHT_INCORRECT_WORDS:
      case "highlight_incorrect_words":
        return (
          <div className="space-y-4">
            {instruction && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">{instruction}</p>
              </div>
            )}
            <HighlightIncorrectWords
              transcript={transcript ?? content}
              value={highlightedWords}
              onChange={setHighlightedWords}
            />
          </div>
        );

      default:
        return (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <p className="text-sm">This question type is not yet supported.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0 transition-all hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Headphones className="h-3 w-3" />
                Audio Prompt
              </span>
              <span className="text-slate-400 font-mono">
                {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-slate-500">
            <Volume2 className="h-4 w-4" />
          </div>
        </div>

        <audio ref={audioRef} src={audioUrl} className="hidden" />
      </div>

      {/* Question Content */}
      {content && (
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-base leading-relaxed text-foreground">{content}</p>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      <Card className="border shadow-sm overflow-hidden">
        <CardContent className="p-6">{renderInputArea()}</CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-muted/30 px-5 py-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <CountdownTimer
            initialSeconds={timeLimit}
            onComplete={() => {
              toast({
                title: "Time's up!",
                description: "Submitting your answer automatically.",
              });
              handleSubmit();
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          {feedback && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnswer()}
            className="min-w-[140px] gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scoring...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Answer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Feedback Display */}
      {feedback && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <FeedbackCard
            feedback={feedback}
            questionType={questionType}
            onRetry={handleRetry}
          />
        </div>
      )}
    </div>
  );
}
