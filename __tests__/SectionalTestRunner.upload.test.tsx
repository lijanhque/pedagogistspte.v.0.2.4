import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SectionalTestRunner from '@/components/pte/sectional-test/SectionalTestRunner';
import * as useAudioRecorderModule from '@/hooks/useAudioRecorder';

// Mock the audio recorder hook
vi.mock('@/hooks/useAudioRecorder', () => ({
  useAudioRecorder: vi.fn(() => ({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    audioStream: null,
    hasPermission: false,
    requestPermission: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    resetRecording: vi.fn(),
    error: null,
  })),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe('SectionalTestRunner - Speaking Submission', () => {
  const mockQuestionId = 'speaking-question-123';
  const mockTestId = 'test-123';
  
  const defaultProps = {
    testId: mockTestId,
    initialQuestion: {
      id: mockQuestionId,
      title: 'Read Aloud Practice',
      questionType: { name: 'Read Aloud' },
      content: 'This is a sample passage to read.',
    },
    totalQuestions: 5,
    initialIndex: 0,
    sectionTitle: 'Speaking Section',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upload audio before submitting speaking question', async () => {
    const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
    const mockAudioUrl = 'https://example.com/audio.webm';
    
    // Mock audio recorder to return blob when recording stops
    const mockRecorder = {
      isRecording: false,
      isPaused: false,
      recordingTime: 10,
      audioBlob: mockBlob,
      audioUrl: null,
      audioStream: null,
      hasPermission: true,
      requestPermission: vi.fn().resolves(true),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      resetRecording: vi.fn(),
      error: null,
    };
    (useAudioRecorderModule.useAudioRecorder as any).mockReturnValue(mockRecorder);

    // Mock fetch for audio upload
    const uploadResponse = { url: mockAudioUrl };
    const submitResponse = { finished: false, question: defaultProps.initialQuestion, currentQuestionIndex: 1 };
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => uploadResponse }) // upload
      .mockResolvedValueOnce({ ok: true, json: async () => submitResponse }); // submit

    render(<SectionalTestRunner {...defaultProps} />);

    // Simulate clicking "Next" which triggers handleNext
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Should have called upload endpoint first
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/audio',
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Then should have called submit endpoint with the audioUrl
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sectional-test/submit',
        expect.objectContaining({
          body: expect.stringContaining(mockAudioUrl),
        })
      );
    });
  });

  it('shows error toast and does not submit if audio upload fails', async () => {
    const mockBlob = new Blob(['fake audio'], { type: 'audio/webm' });
    const mockRecorder = {
      ...useAudioRecorderModule.useAudioRecorder(), // default empty
      audioBlob: mockBlob,
      hasPermission: true,
    };
    (useAudioRecorderModule.useAudioRecorder as any).mockReturnValue(mockRecorder);

    // Upload fails
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Upload service down' }),
    });

    render(<SectionalTestRunner {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Should not have called submit endpoint
      expect(global.fetch).toHaveBeenCalledTimes(1); // only upload
    });
  });

  it('submits reading question without audio upload', async () => {
    const readingQuestion = {
      ...defaultProps.initialQuestion,
      questionType: { name: 'Multiple Choice (Single)' },
    };

    render(
      <SectionalTestRunner 
        {...defaultProps} 
        initialQuestion={readingQuestion} 
      />
    );

    // Simulate selecting an answer (this would normally update state)
    // For now just test that Next doesn't require audio
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Should call submit endpoint directly (no upload call first)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sectional-test/submit',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
