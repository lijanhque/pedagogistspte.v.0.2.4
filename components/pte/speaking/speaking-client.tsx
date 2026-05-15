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
import { AudioWaveform } from "@/components/pte/speaking/audio-waveform";
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

// ─── Types ───────────────────────────────────────────────────────────────────

type Status =
  | "idle"
  | "requesting"   // acquiring mic permission (brief)
  | "preparing"    // prep countdown
  | "recording"    // active recording
  | "recorded"     // blob ready, awaiting submit/retry
  | "submitting"   // uploading + scoring
  | "completed";   // score ready

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toScoreResult(f: SpeakingFeedbackData): ScoreResult {
  return {
    overallScore: f.overallScore,
    content: f.content?.score ?? 0,
    fluency: f.fluency?.score ?? 0,
    pronunciation: f.pronunciation?.score ?? 0,
    feedback: f.suggestions ?? [],
    detailedAnalysis: {
      strengths: f.strengths ?? [],
      improvements: f.areasForImprovement ?? [],
      tips: f.suggestions ?? [],
    },
  };
}

function getTimings(questionType: string) {
  const type = questionType.toLowerCase().replace(/-/g, "_");

  if (type === QuestionType.READ_ALOUD || type === "read_aloud") {
    return { prep: 35, record: 40 };
  }
  if (type === QuestionType.REPEAT_SENTENCE || type === "repeat_sentence") {
    return { prep: 3, record: 15 };
  }
  if (type === QuestionType.DESCRIBE_IMAGE || type === "describe_image") {
    return { prep: 25, record: 40 };
  }
  if (type === QuestionType.RE_TELL_LECTURE || type === "retell_lecture") {
    return { prep: 10, record: 40 };
  }
  if (type === QuestionType.ANSWER_SHORT_QUESTION || type === "answer_short_question") {
    return { prep: 3, record: 10 };
  }
  if (type === QuestionType.RESPOND_TO_A_SITUATION || type === "respond_to_situation") {
    return { prep: 20, record: 40 };
  }
  if (type === QuestionType.SUMMARIZE_GROUP_DISCUSSION || type === "summarize_group_discussion") {
    return { prep: 10, record: 120 };
  }
  return { prep: 10, record: 40 };
}

function getQuestionInstruction(questionType: string): string {
  const type = questionType.toLowerCase().replace(/-/g, "_");

  if (type === QuestionType.READ_ALOUD || type === "read_aloud") {
    return "Look at the text below. In the preparation time, read it silently. After the beep, read it aloud. You will not be able to go back.";
  }
  if (type === QuestionType.REPEAT_SENTENCE || type === "repeat_sentence") {
    return "You will hear a sentence. After listening, repeat the sentence exactly as you heard it.";
  }
  if (type === QuestionType.DESCRIBE_IMAGE || type === "describe_image") {
    return "Look at the image below. Describe in detail what the image is showing. You will have 25 seconds to study the image and 40 seconds to give your response.";
  }
  if (type === QuestionType.RE_TELL_LECTURE || type === "retell_lecture") {
    return "You will hear a lecture. After listening, re-tell the lecture in your own words. You will have 10 seconds to prepare and 40 seconds to give your response.";
  }
  if (type === QuestionType.ANSWER_SHORT_QUESTION || type === "answer_short_question") {
    return "You will hear a question. Give a short answer in one or a few words.";
  }
  if (type === QuestionType.RESPOND_TO_A_SITUATION || type === "respond_to_situation") {
    return "Listen to or read the situation described. Respond appropriately in a natural, conversational way.";
  }
  if (type === QuestionType.SUMMARIZE_GROUP_DISCUSSION || type === "summarize_group_discussion") {
    return "You will hear a discussion between several speakers. Summarize the main points of the discussion in your own words.";
  }
  return "Listen to the prompt and give your response.";
}

function getQuestionTypeLabel(questionType: string): string {
  const type = questionType.toLowerCase().replace(/-/g, "_");

  if (type === "read_aloud") return "Read Aloud";
  if (type === "repeat_sentence") return "Repeat Sentence";
  if (type === "describe_image") return "Describe Image";
  if (type === "retell_lecture") return "Re-tell Lecture";
  if (type === "answer_short_question") return "Answer Short Question";
  if (type === "respond_to_situation") return "Respond to a Situation";
  if (type === "summarize_group_discussion") return "Summarize Group Discussion";
  return "Speaking";
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const recordDuration = timings.record;

  // ── State ──────────────────────────────────────────────────────────────────
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

  // Ref so the prep-timer setInterval always calls the latest recording fn
  const beginRecordingPhaseRef = useRef<() => Promise<void>>(
    () => Promise.resolve()
  );

  const { playBeep } = useBeep();

  const {
    isRecording,
    isProcessing,
    hasPermission,
    transcript,
    segments,
    audioBlob,
    audioStream,
    requestPermission,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useSpeechRecorder();

  // ── Blob ready → transition to "recorded" ──────────────────────────────────
  useEffect(() => {
    if (audioBlob && !isRecording && status === "recording") {
      blobRef.current = audioBlob;
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setStatus("recorded");
    }
  }, [audioBlob, isRecording, status]);

  // ── Recorder error ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (recorderError && status === "recording") {
      prepTimerRef.current && clearInterval(prepTimerRef.current);
      recordTimerRef.current && clearInterval(recordTimerRef.current);
      prepTimerRef.current = null;
      recordTimerRef.current = null;
      toast({
        title: "Recording Error",
        description: recorderError,
        variant: "destructive",
      });
      setStatus("idle");
    }
  }, [recorderError, status]);

  // ── Cleanup timers on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      prepTimerRef.current && clearInterval(prepTimerRef.current);
      recordTimerRef.current && clearInterval(recordTimerRef.current);
    };
  }, []);

  // ── Utilities ──────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    prepTimerRef.current && clearInterval(prepTimerRef.current);
    recordTimerRef.current && clearInterval(recordTimerRef.current);
    prepTimerRef.current = null;
    recordTimerRef.current = null;
  }, []);

  // ── beginRecordingPhase ────────────────────────────────────────────────────
  // Called from the setInterval callback (NOT a user gesture). It must NOT call
  // getUserMedia — the stream was pre-acquired in handleBegin() during the click.
  const beginRecordingPhase = useCallback(async () => {
    playBeep();
    setStatus("recording");
    setRecordTime(recordDuration);

    // startRecording() will reuse the pre-stored stream from requestPermission()
    await startRecording();

    // Auto-stop after recordDuration seconds
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

  // Keep ref in sync so the prep-timer closure always calls the latest version
  beginRecordingPhaseRef.current = beginRecordingPhase;

  // ── beginPrepPhase ─────────────────────────────────────────────────────────
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

  // ── handleBegin ────────────────────────────────────────────────────────────
  // This IS the user gesture. We request mic HERE so the browser allows it.
  const handleBegin = useCallback(async () => {
    setStatus("requesting");
    const granted = await requestPermission();
    if (!granted) {
      toast({
        title: "Microphone Required",
        description:
          "Please allow microphone access in your browser and try again.",
        variant: "destructive",
      });
      setStatus("idle");
      return;
    }
    beginPrepPhase();
  }, [requestPermission, beginPrepPhase]);

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

  // ── Derived values ─────────────────────────────────────────────────────────
  const prepProgress = ((timings.prep - prepTime) / timings.prep) * 100;
  const recordProgress = ((recordDuration - recordTime) / recordDuration) * 100;

  // ── Render ─────────────────────────────────────────────────────────────────
  const instruction = getQuestionInstruction(questionType);
  const typeLabel = getQuestionTypeLabel(questionType);

  return (
    <div className="space-y-6">
      {/* Question type header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
            {typeLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{instruction}</p>
      </div>

      {/* Question content */}
      {content && (
        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-base leading-relaxed">{content}</p>
        </div>
      )}

      {/* Question image (for Describe Image) */}
      {question.imageUrl && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt="Question image"
            className="w-full max-h-80 object-contain"
          />
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle className="size-4 shrink-0" />
          {submitError}
        </div>
      )}

      {/* ===== IDLE ===== */}
      {status === "idle" && (
        <div className="flex flex-col items-center gap-4 py-8">
          {recorderError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 w-full max-w-sm">
              <AlertCircle className="size-4 shrink-0" />
              {recorderError}
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            {timings.prep}s preparation · {recordDuration}s to respond
          </p>
          <Button onClick={handleBegin} size="lg" className="gap-2">
            <PlayCircle className="size-5" /> Begin Practice
          </Button>
        </div>
      )}

      {/* ===== REQUESTING MIC ===== */}
      {status === "requesting" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Waiting for microphone permission…
          </p>
        </div>
      )}

      {/* ===== PREPARING ===== */}
      {status === "preparing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prepare to speak
          </p>

          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48" cy="48" r="40" fill="none"
                strokeWidth="6" stroke="currentColor"
                className="text-muted/30"
              />
              <circle
                cx="48" cy="48" r="40" fill="none"
                strokeWidth="6" stroke="currentColor"
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - prepProgress / 100)}`}
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

      {/* ===== RECORDING ===== */}
      {status === "recording" && (
        <div className="flex flex-col items-center gap-5 py-4">
          {/* Pulsing stop button */}
          <div className="relative inline-flex items-center justify-center">
            {isRecording && [0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
                style={{ animationDelay: `${i * 0.3}s`, animationDuration: "2s" }}
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
              aria-label="Stop recording"
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

          {/* Timer */}
          <p className={cn(
            "text-sm font-semibold tabular-nums",
            isRecording ? "text-destructive" : "text-muted-foreground"
          )}>
            {isRecording ? `${recordTime}s remaining` : "Starting…"}
          </p>

          {/* Record progress bar */}
          <div className="w-full max-w-sm h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all duration-1000 rounded-full"
              style={{ width: `${recordProgress}%` }}
            />
          </div>

          {/* Live audio waveform */}
          <AudioWaveform
            isRecording={isRecording}
            audioStream={audioStream}
            barCount={40}
            className="w-full max-w-sm"
          />

          {/* Live transcript (Web Speech API — Chrome/Edge only) */}
          {transcript && (
            <div className="w-full max-w-lg bg-muted/30 rounded-xl p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-muted-foreground/70">
                Live Transcript
              </p>
              <p className="text-muted-foreground leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== RECORDED ===== */}
      {status === "recorded" && audioUrl && (
        <div className="space-y-4">
          {/* Playback */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your Recording
            </p>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
            />
          </div>

          {/* Synchronized transcript with click-to-seek */}
          {segments.length > 0 && (
            <div className="bg-muted/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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

          {/* Plain transcript fallback (no segments = Firefox/Safari MediaRecorder path) */}
          {segments.length === 0 && transcript && (
            <div className="bg-muted/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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

      {/* ===== SUBMITTING ===== */}
      {status === "submitting" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analysing your response…</p>
        </div>
      )}

      {/* ===== COMPLETED ===== */}
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
