'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

const sentimentEmojis = {
  positive: ['😊', '😄', '🎉', '👍', '❤️', '🥰', '😍'],
  negative: ['😢', '😔', '😞', '👎', '😠', '😭', '💔'],
  neutral: ['🤔', '😐', '👀', '💭', '🤷', '📝', '💡'],
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

      const result = response[0];
      return {
        label: result.label as SentimentResult['label'],
        score: result.score,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getEmojiSuggestions = async (text: string): Promise<string[]> => {
    const sentiment = await getSentiment(text);
    if (!sentiment) return [];

    // Get emojis for the detected sentiment
    const emojis = sentimentEmojis[sentiment.label];
    return sentiment.score > 0.8 ? emojis : emojis.slice(0, 3);
  };

  return {
    getEmojiSuggestions,
    loading,
    error,
  };
};