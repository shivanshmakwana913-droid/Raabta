import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle, Download } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

export default function VoiceMessage({ audioUrl, duration: initialDuration = 0, isMe = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef(null);
  const resolvedAudioUrl = getMediaUrl(audioUrl);

  const handleDownload = async () => {
    try {
      const response = await fetch(resolvedAudioUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `voice_note_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      window.open(resolvedAudioUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!resolvedAudioUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    const audio = new Audio(resolvedAudioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [resolvedAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleSpeedToggle = () => {
    const nextRates = [1, 1.5, 2];
    const nextIndex = (nextRates.indexOf(playbackRate) + 1) % nextRates.length;
    const nextRate = nextRates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate fixed bar heights for visual waveform feel
  const waveformHeights = [
    30, 45, 75, 50, 90, 60, 40, 80, 100, 65, 35, 85, 95, 50, 70, 85, 40, 60,
    90, 75, 55, 35, 65, 80, 45, 90, 60, 30
  ];

  if (hasError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', fontSize: '0.8rem', color: '#ef4444' }}>
        <AlertCircle size={16} />
        <span>Failed to load voice message</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px 0', minWidth: '220px', maxWidth: '290px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: 'none',
            background: isMe ? 'rgba(255, 255, 255, 0.25)' : 'var(--accent-gradient)',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={isPlaying ? 'Pause' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause size={18} style={{ fill: 'currentColor' }} />
          ) : (
            <Play size={18} style={{ fill: 'currentColor', marginLeft: '2px' }} />
          )}
        </button>

        {/* Interactive Waveform Bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={handleSeek}
            style={{ height: '30px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: '4px 0' }}
            title="Seek audio position"
          >
            {waveformHeights.map((height, idx) => {
              const barPercent = (idx / waveformHeights.length) * 100;
              const isPlayed = barPercent <= progressPercent;

              return (
                <span
                  key={idx}
                  style={{
                    flex: 1,
                    borderRadius: '4px',
                    height: `${height}%`,
                    background: isPlayed
                      ? isMe ? '#ffffff' : 'var(--accent-primary)'
                      : isMe ? 'rgba(255, 255, 255, 0.35)' : 'var(--border-color)',
                    transition: 'all 0.15s ease'
                  }}
                />
              );
            })}
          </div>

          {/* Time, Speed & Download controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: isMe ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)' }}>
            <span>
              {isPlaying ? formatAudioTime(currentTime) : formatAudioTime(duration)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSpeedToggle}
                style={{
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  border: 'none',
                  background: isMe ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
                  color: isMe ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={handleDownload}
                style={{
                  padding: '2px',
                  border: 'none',
                  background: 'transparent',
                  color: isMe ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Download voice note"
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
