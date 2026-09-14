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
      <div className="w-full py-2 px-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Microphone access required. Please allow microphone permission in your browser.</span>
        </div>
        <button
          type="button"
          onClick={onCancelRecording}
          className="px-2.5 py-1 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between gap-4 py-1.5 px-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-full animate-in fade-in duration-200">
      {/* Recording indicator & timer */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
        </div>
        <div className="flex items-center space-x-2">
          <Mic className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="font-mono font-semibold text-xs text-red-700 dark:text-red-300">
            {formatTimer(recordingTime)}
          </span>
        </div>
        {uploadError && (
          <span className="text-xs text-rose-600 font-medium truncate max-w-[150px]">
            {uploadError}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isUploading}
          className="p-2 rounded-full text-zinc-500 hover:text-red-600 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="Cancel recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || recordingTime < 1}
          className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
          title="Send voice note"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
