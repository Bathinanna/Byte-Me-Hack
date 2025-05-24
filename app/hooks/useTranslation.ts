import { useState, useCallback } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HF_TOKEN);

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateText = useCallback(async (text: string, targetLang: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await hf.translation({
        model: `Helsinki-NLP/opus-mt-en-${targetLang}`,
        inputs: text,
      });

      return response.translation_text;
    } catch (err) {
      setError('Failed to translate text');
      console.error('Error translating text:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    translateText,
    isLoading,
    error,
  };
} 