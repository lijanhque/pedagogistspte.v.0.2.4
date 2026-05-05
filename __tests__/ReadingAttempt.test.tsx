import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ReadingAttempt from '@/components/pte/attempt/ReadingAttempt';

// Mock child components
vi.mock('@/components/pte/attempt/AttemptController', () => ({
  default: ({ children }: any) => <div>{children({ controls: { submit: () => {} }, phase: 'answering' })}</div>,
}));

vi.mock('@/components/pte/reading/ReadingInput', () => ({
  default: () => <div data-testid="reading-input" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" style={{ width: `${value}%` }} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

global.fetch = vi.fn();

describe('ReadingAttempt', () => {
  const mockQuestionId = 'test-question-123';
  const mockQuestionType: any = 'reading_mc_single';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches question from correct API endpoint (/api/pte/questions)', async () => {
    const mockQuestion = {
      id: mockQuestionId,
      title: 'Test Reading Question',
      questionType: { name: 'reading_mc_single', code: 'reading_mc_single' },
      reading: {
        passageText: 'Test passage',
        options: { choices: ['A', 'B', 'C'] },
      },
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockQuestion],
    });

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={mockQuestionType}
        prompt={null}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/pte/questions?id=${mockQuestionId}`)
      );
    });

    // Should render question title
    expect(screen.getByText('Test Reading Question')).toBeInTheDocument();
  });

  it('handles 404 error gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Question not found' }),
    });

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={mockQuestionType}
        prompt={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Question not found/)).toBeInTheDocument();
    });
  });

  it('uses initialPrompt when provided (no fetch)', async () => {
    const initialPrompt = {
      id: mockQuestionId,
      type: mockQuestionType,
      title: 'Initial Question',
      promptText: 'What is the answer?',
    };

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={mockQuestionType}
        prompt={initialPrompt}
      />
    );

    // fetch should NOT be called
    expect(global.fetch).not.toHaveBeenCalled();

    // Should render immediately
    expect(screen.getByText('Initial Question')).toBeInTheDocument();
  });
});

  it('fetches question from correct API endpoint (/api/pte/questions)', async () => {
    const mockQuestion = {
      id: mockQuestionId,
      title: 'Test Reading Question',
      questionType: { name: 'reading_mc_single', code: 'reading_mc_single' },
      reading: {
        passageText: 'Test passage',
        options: { choices: ['A', 'B', 'C'] },
      },
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockQuestion],
    });

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={mockQuestionType}
        prompt={null}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/pte/questions?id=${mockQuestionId}`)
      );
    });

    // Should render question title
    expect(screen.getByText('Test Reading Question')).toBeInTheDocument();
  });

    it('handles 404 error gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Question not found' }),
      });

      render(
        <ReadingAttempt
          questionId={mockQuestionId}
          questionType={mockQuestionType}
          prompt={null}
        />
      );

      await waitFor(() => {
        // The component displays the error message from the API
        expect(screen.getByText(/Question not found/)).toBeInTheDocument();
      });
    });

  it('normalizes API response to PromptLike shape', async () => {
    const mockQuestion = {
      id: mockQuestionId,
      title: 'Normalized Question',
      content: 'Question content',
      questionType: { name: 'reading_mc_multiple', code: 'reading_mc_multiple' },
      reading: {
        passageText: 'Passage text',
        options: { 
          choices: ['Option 1', 'Option 2', 'Option 3'] 
        },
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockQuestion,
    });

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={'reading_mc_multiple' as any}
        prompt={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Normalized Question')).toBeInTheDocument();
    });
  });

  it('uses initialPrompt when provided (no fetch)', async () => {
    const initialPrompt = {
      id: mockQuestionId,
      type: mockQuestionType,
      title: 'Initial Question',
      promptText: 'What is the answer?',
    };

    render(
      <ReadingAttempt
        questionId={mockQuestionId}
        questionType={mockQuestionType}
        prompt={initialPrompt}
      />
    );

    // fetch should NOT be called
    expect(global.fetch).not.toHaveBeenCalled();

    // Should render immediately
    expect(screen.getByText('Initial Question')).toBeInTheDocument();
  });
});
