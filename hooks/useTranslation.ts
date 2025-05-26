'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';

const languageModels: Record<SupportedLanguage, string> = {
  en: 'Helsinki-NLP/opus-mt-ROMANCE-en',
  es: 'Helsinki-NLP/opus-mt-en-es',
  fr: 'Helsinki-NLP/opus-mt-en-fr',
  de: 'Helsinki-NLP/opus-mt-en-de',
  it: 'Helsinki-NLP/opus-mt-en-it',
  pt: 'Helsinki-NLP/opus-mt-en-pt',
};

export const useTranslation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateMessage = async (
    text: string,
    targetLang: SupportedLanguage
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const model = languageModels[targetLang];
      const response = await hf.translation({
        model,
        inputs: text,
      });

      return response.translation_text;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate message');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    translateMessage,
    loading,
    error,
  };
};