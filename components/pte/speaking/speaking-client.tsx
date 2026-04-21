"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  Volume2,
  Loader2,
  Upload,
  Brain,
  Clock,
} from "lucide-react";

import { useBeep } from "@/hooks/useBeep";
import { toast } from "@/hooks/use-toast";
import {
  QuestionType,
  SpeakingFeedbackData,
  SpeakingQuestion,
} from "@/lib/types";

import {
  uploadSpeakingAudio,
  scoreSpeakingFromUrl,
} from "@/app/actions/pte";

import { ScoreDisplay } from "@/components/pte/speaking/score-display";
import { SpeechInput } from "@/components/ai-elements/speech-input";

type SpeakingStatus =
  | "idle"
  | "playing_audio"
  | "preparing"
  | "recording"
  | "recorded"
  | "uploading"
  | "submitted"
  | "scoring"
  | "completed";

export function SpeakingPracticeClient({
  question,
  autoStart = false,
}: {
  question: SpeakingQuestion;
  autoStart?: boolean;
}) {
  const questionId = question.id;
  const questionType = question.questionType?.code || question.questionTypeId;
  const content = question.content || "";
  const audioUrl =
    question.audioUrl || question.speaking?.audioPromptUrl || undefined;
  const imageUrl = question.imageUrl || undefined;
  const timeLimit = question.questionType?.timeLimit || 40;

  // =========================
  // 🎤 MIC PERMISSION STATE
  // =========================
  const [micPermission, setMicPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        setMicPermission(result.state as any);

        result.onchange = () => {
          setMicPermission(result.state as any);
        };
      } catch {
        // Safari fallback (no permissions API)
      }
    };

    checkPermission();
  }, []);

  // Request mic access
  const requestMicAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      return true;
    } catch {
      setMicPermission("denied");

      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to continue.",
        variant: "destructive",
      });

      return false;
    }
  };

  // =========================
  // TIMINGS
  // =========================
  const getTimings = () => {
    switch (questionType) {
      case "read_aloud":
        return { prep: 35, record: 40 };
      default:
        return { prep: 10, record: 40 };
    }
  };

  const timings = getTimings();
  const recordDuration = timeLimit || timings.record;

  // =========================
  // STATE
  // =========================
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [prepTime, setPrepTime] = useState(timings.prep);
  const [recordTime, setRecordTime] = useState(recordDuration);
  const [feedback, setFeedback] =
    useState<SpeakingFeedbackData | null>(null);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] =
    useState<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechInputRef = useRef<HTMLDivElement>(null);

  const { playBeep } = useBeep();

  // =========================
  // CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // =========================
  // FLOW
  // =========================
  const startSession = () => {
    setPrepTime(timings.prep);
    setRecordTime(recordDuration);
    setStatus("preparing");

    startPrep();
  };

  const startPrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    prepTimerRef.current = setInterval(() => {
      setPrepTime((prev) => {
        if (prev <= 1) {
          clearInterval(prepTimerRef.current!);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // =========================
  // 🎤 RECORDING START
  // =========================
  const beginRecording = async () => {
    const hasPermission = await requestMicAccess();
    if (!hasPermission) return;

    playBeep();

    setTimeout(() => {
      setStatus("recording");
      setIsRecordingActive(true);
      setRecordTime(recordDuration);

      recordTimerRef.current = setInterval(() => {
        setRecordTime((prev) => {
          if (prev <= 1) {
            clearInterval(recordTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      speechInputRef.current?.querySelector("button")?.click();
    }, 300);
  };

  const handleAudioRecorded = async (blob: Blob) => {
    setRecordedBlob(blob);
    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);
    setStatus("recorded");
    setIsRecordingActive(false);
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-8">
      {/* 🎤 PERMISSION WARNING */}
      {micPermission === "denied" && (
        <div className="text-center text-red-500 text-sm">
          Microphone access is blocked. Please enable it in browser settings.
        </div>
      )}

      {/* 🎤 ENABLE BUTTON */}
      {micPermission !== "granted" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={requestMicAccess}>
            Enable Microphone
          </Button>
        </div>
      )}

      {/* QUESTION */}
      {content && (
        <div className="p-6 border rounded-xl">
          <p className="text-lg">{content}</p>
        </div>
      )}

      {/* CONTROLS */}
      <div className="text-center">
        {status === "idle" && (
          <Button onClick={startSession} size="lg">
            <PlayCircle className="mr-2" /> Start
          </Button>
        )}

        {status === "preparing" && (
          <div className="text-4xl">{prepTime}</div>
        )}

        {status === "recording" && (
          <div className="space-y-4">
            <div className="text-red-500">Recording... {recordTime}s</div>

            <div ref={speechInputRef}>
              <SpeechInput
                onTranscriptionChange={setTranscript}
                onAudioRecorded={handleAudioRecorded}
                autoStop
                maxDuration={recordDuration}
              />
            </div>
          </div>
        )}

        {status === "recorded" && recordedUrl && (
          <div className="space-y-4">
            <audio src={recordedUrl} controls className="w-full" />

            <Button onClick={() => setStatus("idle")}>
              <RotateCcw className="mr-2" /> Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
      }
