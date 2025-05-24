import { useState, useCallback } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HF_TOKEN);

export function useMessageSuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.2,
        },
      });

      return response.generated_text;
    } catch (err) {
      setError('Failed to get message suggestions');
      console.error('Error getting suggestions:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getSuggestions,
    isLoading,
    error,
  };
} 