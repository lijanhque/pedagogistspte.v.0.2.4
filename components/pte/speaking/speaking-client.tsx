"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MicIcon,
  PlayCircle,
  RotateCcw,
  SquareIcon,
} from "lucide-react";
import { useSpeechRecorder } from "@/hooks/useSpeechRecorder";
import { useBeep } from "@/hooks/useBeep";
import { toast } from "@/hooks/use-toast";
import {
  Transcription,
  TranscriptionSegment,
} from "@/components/ai-elements/transcription";
import { ScoreDisplay } from "@/components/pte/speaking/score-display";
import {
  scoreSpeakingAttempt,
  scoreReadAloudAttempt,
} from "@/app/actions/pte";
import {
  QuestionType,
  type SpeakingFeedbackData,
  type SpeakingQuestion,
} from "@/lib/types";
import type { ScoreResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Status =
  | "idle"
  | "preparing"
  | "recording"
  | "recorded"
  | "submitting"
  | "completed";

function toScoreResult(feedback: SpeakingFeedbackData): ScoreResult {
  return {
    overallScore: feedback.overallScore,
    content: feedback.content?.score ?? 0,
    fluency: feedback.fluency?.score ?? 0,
    pronunciation: feedback.pronunciation?.score ?? 0,
    feedback: feedback.suggestions ?? [],
    detailedAnalysis: {
      strengths: feedback.strengths ?? [],
      improvements: feedback.areasForImprovement ?? [],
      tips: feedback.suggestions ?? [],
    },
  };
}

function getTimings(questionType: string) {
  if (
    questionType === QuestionType.READ_ALOUD ||
    questionType === "read_aloud"
  ) {
    return { prep: 35, record: 40 };
  }
  return { prep: 10, record: 40 };
}

export function SpeakingPracticeClient({
  question,
}: {
  question: SpeakingQuestion;
  autoStart?: boolean;
}) {
  const questionType =
    (question.questionType?.code as QuestionType) ??
    (question.questionTypeId as QuestionType);
  const content = question.content ?? "";
  const timings = getTimings(questionType);
  const recordDuration = question.questionType?.timeLimit ?? timings.record;

  const [status, setStatus] = useState<Status>("idle");
  const [prepTime, setPrepTime] = useState(timings.prep);
  const [recordTime, setRecordTime] = useState(recordDuration);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [feedback, setFeedback] = useState<SpeakingFeedbackData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Use a ref for the recording phase fn to avoid stale closures in the prep timer
  const beginRecordingPhaseRef = useRef<() => Promise<void>>(
    () => Promise.resolve()
  );

  const { playBeep } = useBeep();

  const {
    isRecording,
    isProcessing,
    transcript,
    segments,
    audioBlob,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useSpeechRecorder();

  // Transition to "recorded" once the audio blob is ready
  useEffect(() => {
    if (audioBlob && !isRecording && status === "recording") {
      blobRef.current = audioBlob;
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setStatus("recorded");
    }
  }, [audioBlob, isRecording, status]);

  // Handle mic / recorder errors during recording
  useEffect(() => {
    if (recorderError && status === "recording") {
      prepTimerRef.current && clearInterval(prepTimerRef.current);
      recordTimerRef.current && clearInterval(recordTimerRef.current);
      prepTimerRef.current = null;
      recordTimerRef.current = null;
      toast({
        title: "Microphone Error",
        description: recorderError,
        variant: "destructive",
      });
      setStatus("idle");
    }
  }, [recorderError, status]);

  // Cleanup timers and object URLs on unmount
  useEffect(() => {
    return () => {
      prepTimerRef.current && clearInterval(prepTimerRef.current);
      recordTimerRef.current && clearInterval(recordTimerRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    prepTimerRef.current && clearInterval(prepTimerRef.current);
    recordTimerRef.current && clearInterval(recordTimerRef.current);
    prepTimerRef.current = null;
    recordTimerRef.current = null;
  }, []);

  // Defined with useCallback so it's stable, kept in sync via ref
  const beginRecordingPhase = useCallback(async () => {
    playBeep();
    setStatus("recording");
    setRecordTime(recordDuration);

    // startRecording handles mic permission internally; sets error on denial
    await startRecording();

    // Start the countdown timer (stopRecording is safe to call even if start failed)
    recordTimerRef.current = setInterval(() => {
      setRecordTime((prev) => {
        if (prev <= 1) {
          clearInterval(recordTimerRef.current!);
          recordTimerRef.current = null;
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playBeep, recordDuration, startRecording, stopRecording]);

  // Keep the ref in sync with the latest callback
  beginRecordingPhaseRef.current = beginRecordingPhase;

  const beginPrepPhase = useCallback(() => {
    clearTimers();
    setPrepTime(timings.prep);
    setStatus("preparing");

    if (timings.prep === 0) {
      void beginRecordingPhaseRef.current();
      return;
    }

    prepTimerRef.current = setInterval(() => {
      setPrepTime((prev) => {
        if (prev <= 1) {
          clearInterval(prepTimerRef.current!);
          prepTimerRef.current = null;
          void beginRecordingPhaseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers, timings.prep]);

  const handleManualStop = useCallback(() => {
    clearTimers();
    stopRecording();
  }, [clearTimers, stopRecording]);

  const handleRetry = useCallback(() => {
    clearTimers();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setStatus("idle");
    setAudioUrl(null);
    setFeedback(null);
    setSubmitError(null);
    blobRef.current = null;
  }, [clearTimers, audioUrl]);

  const handleSubmit = useCallback(async () => {
    if (!blobRef.current) return;

    setStatus("submitting");
    setSubmitError(null);

    const file = new File([blobRef.current], "recording.webm", {
      type: "audio/webm",
    });

    const result =
      questionType === QuestionType.READ_ALOUD
        ? await scoreReadAloudAttempt(file, content, question.id)
        : await scoreSpeakingAttempt(questionType, file, content, question.id);

    if (result.success && result.feedback) {
      setFeedback(result.feedback);
      setStatus("completed");
    } else {
      setSubmitError(result.error ?? "Scoring failed. Please try again.");
      setStatus("recorded");
    }
  }, [content, question.id, questionType]);

  // ------- Derived values -------
  const prepProgress = ((timings.prep - prepTime) / timings.prep) * 100;
  const recordProgress = ((recordDuration - recordTime) / recordDuration) * 100;

  return (
    <div className="space-y-6">
      {/* Error banners */}
      {submitError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="size-4 shrink-0" />
          {submitError}
        </div>
      )}

      {/* ====== IDLE ====== */}
      {status === "idle" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              You have {timings.prep}s to prepare, then {recordDuration}s to
              respond.
            </p>
          </div>
          <Button onClick={beginPrepPhase} size="lg" className="gap-2">
            <PlayCircle className="size-5" /> Begin Practice
          </Button>
        </div>
      )}

      {/* ====== PREPARING ====== */}
      {status === "preparing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Prepare to speak
          </p>

          {/* Circular countdown */}
          <div className="relative w-24 h-24">
            <svg
              className="w-24 h-24 -rotate-90"
              viewBox="0 0 96 96"
              aria-hidden="true"
            >
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-primary transition-all duration-1000"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - prepProgress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{prepTime}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Recording begins automatically
          </p>
        </div>
      )}

      {/* ====== RECORDING ====== */}
      {status === "recording" && (
        <div className="flex flex-col items-center gap-5 py-6">
          {/* Pulsing mic / stop button */}
          <div className="relative inline-flex items-center justify-center">
            {isRecording &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
                  style={{
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: "2s",
                  }}
                />
              ))}
            <Button
              className={cn(
                "relative z-10 size-16 rounded-full transition-all duration-300",
                isRecording
                  ? "bg-destructive hover:bg-destructive/80 text-white"
                  : "bg-muted text-muted-foreground"
              )}
              onClick={handleManualStop}
              disabled={isProcessing}
              aria-label={isRecording ? "Stop recording" : "Starting…"}
            >
              {isProcessing ? (
                <Loader2 className="size-6 animate-spin" />
              ) : isRecording ? (
                <SquareIcon className="size-6" />
              ) : (
                <MicIcon className="size-6 animate-pulse" />
              )}
            </Button>
          </div>

          <div className="text-sm font-medium text-destructive tabular-nums">
            {isRecording ? `${recordTime}s remaining` : "Starting…"}
          </div>

          {/* Record progress bar */}
          <div className="w-full max-w-sm">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive transition-all duration-1000 rounded-full"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          </div>

          {/* Live transcript (Web Speech API only) */}
          {transcript && (
            <div className="w-full max-w-lg bg-muted/30 rounded-xl p-4 text-sm leading-relaxed">
              <p className="text-xs font-medium uppercase tracking-wide mb-2 text-muted-foreground/70">
                Live Transcript
              </p>
              <p className="text-muted-foreground">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* ====== RECORDED ====== */}
      {status === "recorded" && audioUrl && (
        <div className="space-y-4">
          {/* Audio playback */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your Recording
            </p>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              onTimeUpdate={(e) =>
                setPlaybackTime(e.currentTarget.currentTime)
              }
            />
          </div>

          {/* Synchronized transcript (clickable segments) */}
          {segments.length > 0 && (
            <div className="bg-muted/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Transcript
              </p>
              <Transcription
                segments={segments}
                currentTime={playbackTime}
                onSeek={(time) => {
                  if (audioRef.current) audioRef.current.currentTime = time;
                }}
              >
                {(segment, index) => (
                  <TranscriptionSegment
                    key={`${segment.startSecond}-${index}`}
                    segment={segment}
                    index={index}
                  />
                )}
              </Transcription>
            </div>
          )}

          {/* Plain transcript fallback (no segments) */}
          {segments.length === 0 && transcript && (
            <div className="bg-muted/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Transcript
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {transcript}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RotateCcw className="size-4" /> Retry
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <CheckCircle2 className="size-4" /> Submit for Scoring
            </Button>
          </div>
        </div>
      )}

      {/* ====== SUBMITTING ====== */}
      {status === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analysing your response…
          </p>
        </div>
      )}

      {/* ====== COMPLETED ====== */}
      {status === "completed" && feedback && (
        <div className="space-y-6">
          <ScoreDisplay
            score={toScoreResult(feedback)}
            spokenText={feedback.transcript ?? transcript}
            originalText={content}
            audioUrl={audioUrl ?? undefined}
            wordMarking={feedback.wordMarking}
          />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RotateCcw className="size-4" /> Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
