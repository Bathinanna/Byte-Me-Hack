'use client';

import { useState } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

export const useConversationSummary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarizeConversation = async (messages: string[]): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Format messages into a single text
      const conversationText = messages
        .map((msg, i) => `[${i + 1}] ${msg}`)
        .join('\n');

      const response = await hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: conversationText,
        parameters: {
          max_length: 130,
          min_length: 30,
        },
      });

      return response.summary_text;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summarize conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    summarizeConversation,
    loading,
    error,
  };
};