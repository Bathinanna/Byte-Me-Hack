'use client';

import { useState, useRef } from 'react';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY);

export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current) {
        reject('No recording in progress');
        return;
      }

      mediaRecorder.current.onstop = async () => {
        try {
          setLoading(true);
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
          
          // Convert audio to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const base64Data = base64Audio.split(',')[1];

            // Send to Whisper API
            const response = await hf.automaticSpeechRecognition({
              model: 'openai/whisper-base',
              data: base64Data,
            });

            resolve(response.text);
          };
        } catch (err) {
          reject(err instanceof Error ? err.message : 'Failed to transcribe audio');
        } finally {
          setLoading(false);
          setIsRecording(false);
          // Stop all audio tracks
          mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.current.stop();
    });
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    loading,
    error,
  };
};