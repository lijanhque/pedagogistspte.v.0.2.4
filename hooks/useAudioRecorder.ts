import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioStream: MediaStream | null;
  hasPermission: boolean;
  /** Call during a user-gesture to pre-acquire the mic stream. */
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

function bestMimeType(): string {
  return (
    [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((m) => MediaRecorder.isTypeSupported(m)) ?? ""
  );
}

export function useAudioRecorder(maxDuration = 60): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Keep a stable ref to stopRecording so the timer closure always calls the latest copy
  const stopRecordingRef = useRef<() => void>(() => { });

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDuration) {
          stopRecordingRef.current();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [maxDuration, stopTimer]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [stopTimer]);

  // ── requestPermission ───────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      // Release any stale stream
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      streamRef.current = stream;
      setAudioStream(stream);
      setHasPermission(true);
      return true;
    } catch {
      setError("Microphone access denied. Please allow microphone and try again.");
      setHasPermission(false);
      return false;
    }
  }, []);

  // ── startRecording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Reuse the pre-acquired stream from requestPermission() when possible
      let stream = streamRef.current;
      const streamIsLive =
        stream !== null &&
        stream.getTracks().every((t) => t.readyState === "live");

      if (!streamIsLive) {
        stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        streamRef.current = stream;
      }

      setAudioStream(stream);

      const mimeType = bestMimeType();
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) track.stop();
          streamRef.current = null;
        }
        setAudioStream(null);
        setHasPermission(false);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch (err) {
      console.error("startRecording failed:", err);
      setError("Could not access microphone. Please grant permission.");
    }
  }, [startTimer]);

  // ── stopRecording ───────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    stopTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  }, [stopTimer]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // ── pauseRecording / resumeRecording ────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [startTimer]);

  // ── resetRecording ──────────────────────────────────────────────────────────
  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    audioStream,
    hasPermission,
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
  };
}
