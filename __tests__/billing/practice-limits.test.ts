import { describe, it, expect } from 'vitest';
import { getCreditsNeeded } from '../../lib/subscription/credits';

describe('Practice Limits Integration', () => {
  describe('getCreditsNeeded', () => {
    it('returns 0 for auto-scored reading types', () => {
      expect(getCreditsNeeded('multiple_choice_single')).toBe(0);
      expect(getCreditsNeeded('multiple_choice_multiple')).toBe(0);
      expect(getCreditsNeeded('reorder_paragraphs')).toBe(0);
      expect(getCreditsNeeded('fill_in_blanks')).toBe(0);
      expect(getCreditsNeeded('reading_writing_fill_blanks')).toBe(0);
    });

    it('returns 1 for speaking types (require AI)', () => {
      expect(getCreditsNeeded('read_aloud')).toBe(1);
      expect(getCreditsNeeded('describe_image')).toBe(1);
      expect(getCreditsNeeded('repeat_sentence')).toBe(1);
      expect(getCreditsNeeded('retell_lecture')).toBe(1);
      expect(getCreditsNeeded('answer_short_question')).toBe(1);
    });

    it('returns 1 for writing types (require AI)', () => {
      expect(getCreditsNeeded('write_essay')).toBe(1);
      expect(getCreditsNeeded('summarize_written_text')).toBe(1);
    });
  });
});
