import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MockTestRunner from '@/components/pte/mock-test/MockTestRunner';
import SpeakingRecorder from '@/components/pte/speaking/SpeakingRecorder';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock SpeakingRecorder to provide blob
vi.mock('@/components/pte/speaking/SpeakingRecorder', () => ({
  SpeakingRecorder: ({ onRecorded }: any) => (
    <div data-testid="speaking-recorder">
      <button onClick={() => onRecorded({ blob: new Blob(['audio'], { type: 'audio/webm' }) })}>
        Simulate Recording
      </button>
    </div>
  ),
}));

describe('MockTestRunner - Speaking Audio Upload', () => {
  const mockTestId = 'mock-test-123';
  const mockQuestionId = 'question-123';
  
  const defaultProps = {
    attemptId: mockTestId,
    initialQuestion: {
      id: mockQuestionId,
      title: 'Speaking Task',
      questionType: { name: 'Read Aloud' },
      timeLimit: 40,
    },
    totalQuestions: 3,
    initialIndex: 0,
    title: 'Mock Test',
    initialSectionTitle: 'Speaking',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads audio blob to /api/upload/audio before submitting', async () => {
    const mockAudioUrl = 'https://blob.example.com/audio.webm';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: mockAudioUrl }) }) // upload
      .mockResolvedValueOnce({ ok: true, json: async () => ({ completed: true, testCompleted: true }) }); // submit

    render(<MockTestRunner {...defaultProps} />);

    // First, simulate recording completion
    const recordButton = screen.getByText('Simulate Recording');
    fireEvent.click(recordButton);

    // Then click Next
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    // First call should be upload
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/upload/audio',
      expect.objectContaining({ method: 'POST' })
    );

    // Second call should be submit with audioUrl
    const submitCall = (global.fetch as any).mock.calls[1];
    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.answer.audioUrl).toBe(mockAudioUrl);
  });

  it('does not show "simulated upload" error message', async () => {
    const mockAudioUrl = 'https://blob.example.com/audio.webm';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: mockAudioUrl }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ completed: true })});

    render(<MockTestRunner {...defaultProps} />);

    const recordButton = screen.getByText('Simulate Recording');
    fireEvent.click(recordButton);
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Should NOT contain mock error
      expect(screen.queryByText(/Audio Upload Simulated/i)).not.toBeInTheDocument();
    });
  });
});
