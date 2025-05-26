'use client';

import { useState, useCallback } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

export const useMessageSuggestions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (context: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: context,
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7,
          top_k: 50,
          top_p: 0.95,
        },
      });

      return response.generated_text;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getSuggestions,
    loading,
    error,
  };
};