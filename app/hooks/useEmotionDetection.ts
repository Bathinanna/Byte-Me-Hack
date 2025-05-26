'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionResult {
  label: Emotion;
  score: number;
}

export const useEmotionDetection = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectEmotion = async (text: string): Promise<EmotionResult | null> => {
    setLoading(true);
    setError(null);

    // Custom override for party/win messages
    if (/\b(won|party|congrats|celebrate|victory)\b/i.test(text)) {
      setLoading(false);
      return { label: 'joy', score: 1 };
    }

    try {
      const response = await hf.textClassification({
        model: 'j-hartmann/emotion-english-distilroberta-base',
        inputs: text,
      });

      const result = response[0];
      return {
        label: result.label as Emotion,
        score: result.score,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect emotion');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getAvatarExpression = (emotion: Emotion) => {
    const expressions = {
      joy: '/avatars/happy.svg',
      sadness: '/avatars/sad.svg',
      anger: '/avatars/angry.svg',
      fear: '/avatars/scared.svg',
      love: '/avatars/loving.svg',
      surprise: '/avatars/surprised.svg',
      neutral: '/avatars/neutral.svg',
    };

    return expressions[emotion] || expressions.neutral;
  };

  return {
    detectEmotion,
    getAvatarExpression,
    loading,
    error,
  };
};