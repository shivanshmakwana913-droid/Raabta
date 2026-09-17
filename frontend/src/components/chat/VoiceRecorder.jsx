import React, { useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Send, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function VoiceRecorder({ onSendVoiceMessage, onCancelRecording }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startMicrophone();

    return () => {
      stopTracksAndTimer();
    };
  }, []);

  const stopTracksAndTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startMicrophone = async () => {
    try {
      setPermissionError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('[Microphone Permission Error]:', err);
      setPermissionError(true);
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTracksAndTimer();
    onCancelRecording();
  };

  const handleSend = async () => {
    if (!mediaRecorderRef.current || recordingTime < 1) {
      handleCancel();
      return;
    }

    setIsUploading(true);
    const durationSec = recordingTime;

    mediaRecorderRef.current.onstop = async () => {
      try {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size === 0) {
          setUploadError('Recorded audio is empty.');
          setIsUploading(false);
          return;
        }

        const formData = new FormData();
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        formData.append('audio', audioBlob, `voice_note.${extension}`);

        const { data } = await api.post('/messages/upload-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        stopTracksAndTimer();
        onSendVoiceMessage({
          audioUrl: data.url,
          duration: data.duration || durationSec
        });
      } catch (err) {
        console.error('[Voice Upload Error]:', err);
        setUploadError(err.response?.data?.message || 'Failed to upload voice message.');
        setIsUploading(false);
      }
    };

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (permissionError) {
    return (
      <div
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.82rem',
          color: '#f87171'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>Microphone access required. Please allow microphone permission in your browser.</span>
        </div>
        <button
          type="button"
          onClick={onCancelRecording}
          style={{
            padding: '4px 12px',
            background: '#ef4444',
            color: '#ffffff',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '6px 14px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Live recording pulse & timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulseRing 1.5s infinite ease-in-out',
              opacity: 0.8
            }}
          />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mic size={16} style={{ color: '#ef4444' }} />
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {formatTimer(recordingTime)}
          </span>
        </div>

        {/* Live Audio Visualizer Bars Animation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}>
          {[12, 20, 16, 24, 10, 22, 14, 18].map((h, i) => (
            <span
              key={i}
              style={{
                width: '3px',
                height: `${h}px`,
                background: '#ef4444',
                borderRadius: '2px',
                animation: `shimmer ${0.6 + i * 0.15}s infinite ease-in-out alternate`
              }}
            />
          ))}
        </div>

        {uploadError && (
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uploadError}
          </span>
        )}
      </div>

      {/* Cancel and Send action controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isUploading}
          title="Cancel recording"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: 'none',
            color: '#ef4444',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || recordingTime < 1}
          title="Send voice note"
          style={{
            background: 'var(--accent-gradient)',
            border: 'none',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: recordingTime < 1 || isUploading ? 'not-allowed' : 'pointer',
            opacity: recordingTime < 1 || isUploading ? 0.5 : 1,
            boxShadow: 'var(--accent-shadow)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (recordingTime >= 1 && !isUploading) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
