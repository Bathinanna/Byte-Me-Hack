'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

const sentimentEmojis: Record<string, string[]> = {
  positive: ['😊', '😄', '🎉', '👍', '❤️', '🥰', '😍'],
  negative: ['😢', '😔', '😞', '👎', '😠', '😭', '💔'],
  neutral: ['🤔', '😐', '👀', '💭', '🤷', '📝', '💡'],
  LABEL_0: ['😢', '😔', '��'],
  LABEL_1: ['🤔', '😐', '👀'],
  LABEL_2: ['😊', '😄', '🎉'],
};

export const useEmojiSuggestions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSentiment = async (text: string): Promise<SentimentResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await hf.textClassification({
        model: 'cardiffnlp/twitter-roberta-base-sentiment',
        inputs: text,
      });

      console.log("[useEmojiSuggestions] Raw sentiment response:", response);

      const result = response[0];
      if (!result) {
        setError('No sentiment result returned from API');
        return null;
      }

      let normalizedLabel = result.label.toLowerCase();
      if (normalizedLabel === 'label_0') normalizedLabel = 'negative';
      if (normalizedLabel === 'label_1') normalizedLabel = 'neutral';
      if (normalizedLabel === 'label_2') normalizedLabel = 'positive';
      
      if (normalizedLabel !== 'positive' && normalizedLabel !== 'negative' && normalizedLabel !== 'neutral') {
        console.warn(`[useEmojiSuggestions] Unexpected sentiment label: ${result.label}. Defaulting to neutral.`);
        normalizedLabel = 'neutral';
      }

      return {
        label: normalizedLabel as SentimentResult['label'],
        score: result.score,
      };
    } catch (err) {
      console.error("[useEmojiSuggestions] Error in getSentiment:", err);
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getEmojiSuggestions = async (text: string): Promise<string[]> => {
    const sentiment = await getSentiment(text);
    if (!sentiment || !sentiment.label) return ['👍', '🤔'];

    const emojis = sentimentEmojis[sentiment.label];

    if (!Array.isArray(emojis) || emojis.length === 0) {
      console.warn(`[useEmojiSuggestions] No emojis found for sentiment label: ${sentiment.label}. Returning default.`);
      return ['��', '🤔', '😊'];
    }

    return sentiment.score > 0.8 ? emojis : emojis.slice(0, Math.min(3, emojis.length));
  };

  return {
    getEmojiSuggestions,
    loading,
    error,
  };
};