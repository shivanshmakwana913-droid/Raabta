import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

export default function VoiceMessage({ audioUrl, duration: initialDuration = 0, isMe = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
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
  }, [audioUrl]);

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
      <div className="flex items-center space-x-2 py-2 px-1 text-xs text-rose-500 font-medium">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Failed to load voice message</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-1 min-w-[210px] max-w-[280px]">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm ${
            isMe
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
          title={isPlaying ? 'Pause' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Interactive Waveform Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            onClick={handleSeek}
            className="h-8 flex items-center gap-[3px] cursor-pointer group py-1"
            title="Seek audio position"
          >
            {waveformHeights.map((height, idx) => {
              const barPercent = (idx / waveformHeights.length) * 100;
              const isPlayed = barPercent <= progressPercent;

              return (
                <span
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPlayed
                      ? isMe
                        ? 'bg-white'
                        : 'bg-indigo-600 dark:bg-indigo-400'
                      : isMe
                      ? 'bg-white/30 group-hover:bg-white/40'
                      : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          {/* Time & Speed controls */}
          <div
            className={`flex items-center justify-between text-[11px] font-medium leading-none ${
              isMe ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <span>
              {isPlaying ? formatAudioTime(currentTime) : formatAudioTime(duration)}
            </span>

            <button
              type="button"
              onClick={handleSpeedToggle}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                isMe
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
              title="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
