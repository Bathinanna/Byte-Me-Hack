import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useCall(userId: string, remoteUserId: string) {
  const [inCall, setInCall] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.emit('join', userId);

    socketRef.current.on('call:offer', async (data: any) => {
      setCallType(data.type);
      setInCall(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: data.type === 'video', audio: true });
      setLocalStream(stream);
      pcRef.current = new RTCPeerConnection();
      stream.getTracks().forEach(track => pcRef.current!.addTrack(track, stream));
      pcRef.current.ontrack = (e) => setRemoteStream(e.streams[0]);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current.emit('call:answer', { target: data.from, answer });
    });

    socketRef.current.on('call:answer', async (data: any) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socketRef.current.on('call:ice-candidate', (data: any) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    socketRef.current.on('call:end', () => {
      endCall();
    });

    return () => {
      socketRef.current.disconnect();
      endCall();
    };
    // eslint-disable-next-line
  }, [userId]);

  const startCall = async (type: 'audio' | 'video') => {
    setCallType(type);
    setInCall(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
    setLocalStream(stream);
    pcRef.current = new RTCPeerConnection();
    stream.getTracks().forEach(track => pcRef.current!.addTrack(track, stream));
    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('call:ice-candidate', { target: remoteUserId, candidate: e.candidate });
      }
    };
    pcRef.current.ontrack = (e) => setRemoteStream(e.streams[0]);
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current.emit('call:offer', { from: userId, target: remoteUserId, offer, type });
  };

  const endCall = () => {
    setInCall(false);
    setCallType(null);
    setRemoteStream(null);
    setLocalStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    socketRef.current.emit('call:end', { target: remoteUserId });
  };

  return { inCall, callType, localStream, remoteStream, startCall, endCall };
} 