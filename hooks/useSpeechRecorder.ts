import { useState, useRef, useCallback, useEffect } from "react";

// ─── Web Speech API type shims ───────────────────────────────────────────────

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TranscriptionSegment {
  text: string;
  startSecond: number;
  endSecond: number;
}

interface UseSpeechRecorderOptions {
  lang?: string;
  onTranscriptUpdate?: (text: string) => void;
  onSegmentUpdate?: (segments: TranscriptionSegment[]) => void;
}

interface UseSpeechRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  supportsSpeechRecognition: boolean;
  hasPermission: boolean;
  transcript: string;
  segments: TranscriptionSegment[];
  audioBlob: Blob | null;
  /** Live MediaStream — pass this to AudioWaveform while recording. */
  audioStream: MediaStream | null;
  /**
   * Call this during a user-gesture (button click) to pre-acquire the mic.
   * The acquired stream is kept alive so startRecording() can reuse it from a
   * timer callback without triggering another getUserMedia permission prompt.
   */
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSpeechRecorder({
  lang = "en-US",
  onTranscriptUpdate,
  onSegmentUpdate,
}: UseSpeechRecorderOptions = {}): UseSpeechRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const lastSegmentEndRef = useRef<number>(0);

  // ── Detect & initialise Web Speech API ─────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      return;
    }

    setSupportsSpeechRecognition(true);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      const currentTime = (Date.now() - recordingStartTimeRef.current) / 1000;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0]?.transcript ?? "";
          finalTranscript += text;

          const segment: TranscriptionSegment = {
            text: text.trim(),
            startSecond: lastSegmentEndRef.current,
            endSecond: currentTime,
          };

          if (segment.text) {
            setSegments((prev) => {
              const updated = [...prev, segment];
              onSegmentUpdate?.(updated);
              return updated;
            });
            lastSegmentEndRef.current = currentTime;
          }
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => {
          const updated = prev + finalTranscript;
          onTranscriptUpdate?.(updated);
          return updated;
        });
      }
    };

    recognition.onerror = () => {
      // Speech recognition errors are non-fatal; MediaRecorder keeps going.
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, []);

  // ── requestPermission ───────────────────────────────────────────────────────
  /**
   * Must be called inside a click/touch handler (user gesture) so the browser
   * allows getUserMedia. The acquired stream is stored in streamRef so that
   * startRecording() — which may be called from a timer — can reuse it without
   * triggering a second permission prompt.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Tear down any stale stream first
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

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
      setTranscript("");
      setSegments([]);
      setAudioBlob(null);
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      lastSegmentEndRef.current = 0;

      // Re-use the pre-acquired stream when available (avoids getUserMedia from
      // a timer context, which browsers may block).  Fall back to a fresh
      // getUserMedia call only if the stream was never obtained or has ended.
      let stream = streamRef.current;
      const streamIsLive =
        stream !== null &&
        stream.getTracks().every((t) => t.readyState === "live");

      if (!streamIsLive) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 16000,
          },
        });
        streamRef.current = stream;
      }

      setAudioStream(stream);

      // Pick the best supported MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks & release stream
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) track.stop();
          streamRef.current = null;
        }
        setAudioStream(null);
        setHasPermission(false);

        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setIsProcessing(false);
      };

      mediaRecorder.onerror = () => {
        setError("Recording failed.");
        setIsRecording(false);
        setIsProcessing(false);
      };

      mediaRecorder.start(100); // timeslice: chunk every 100 ms

      // Web Speech API for live transcript (optional — doesn't affect audio recording)
      if (supportsSpeechRecognition && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* already started */ }
      }

      setIsRecording(true);
      setIsProcessing(false);
    } catch (err) {
      console.error("startRecording failed:", err);
      setError("Could not access microphone. Please grant permission.");
    }
  }, [supportsSpeechRecognition]);

  // ── stopRecording ───────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsProcessing(true);

    try { recognitionRef.current?.stop(); } catch { /* ignore */ }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      // onstop handler will flip isProcessing → false and set audioBlob
    } else {
      setIsProcessing(false);
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    supportsSpeechRecognition,
    hasPermission,
    transcript,
    segments,
    audioBlob,
    audioStream,
    requestPermission,
    startRecording,
    stopRecording,
    error,
  };
}
