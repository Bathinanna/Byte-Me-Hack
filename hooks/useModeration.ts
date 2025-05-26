import { useState, useCallback } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HF_TOKEN);

export function useModeration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moderateContent = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await hf.textClassification({
        model: 'facebook/roberta-hate-speech-dynabench-r4-target',
        inputs: text,
      });

      const isSafe = response[0].label === 'nothate';
      const confidence = response[0].score;

      return {
        isSafe,
        confidence,
        label: response[0].label,
      };
    } catch (err) {
      setError('Failed to moderate content');
      console.error('Error moderating content:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    moderateContent,
    isLoading,
    error,
  };
} 