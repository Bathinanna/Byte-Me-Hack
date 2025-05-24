'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

interface ToxicityResult {
  isToxic: boolean;
  score: number;
  type: string;
}

export const useToxicityFilter = (threshold = 0.8) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkToxicity = async (text: string): Promise<ToxicityResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await hf.textClassification({
        model: 'unitary/toxic-bert',
        inputs: text,
      });

      const result = response[0];
      const isToxic = result.score > threshold;

      return {
        isToxic,
        score: result.score,
        type: result.label,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check toxicity');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const filterMessage = async (text: string): Promise<{
    isAllowed: boolean;
    filteredText?: string;
    reason?: string;
  }> => {
    const result = await checkToxicity(text);

    if (!result) {
      return { isAllowed: true };
    }

    if (result.isToxic) {
      return {
        isAllowed: false,
        reason: `Message blocked: ${result.type} content detected (${Math.round(result.score * 100)}% confidence)`,
      };
    }

    // For borderline cases (score > 0.5 but < threshold), add a warning
    if (result.score > 0.5) {
      return {
        isAllowed: true,
        filteredText: text,
        reason: `Warning: This message may contain ${result.type} content`,
      };
    }

    return { isAllowed: true, filteredText: text };
  };

  return {
    checkToxicity,
    filterMessage,
    loading,
    error,
  };
};