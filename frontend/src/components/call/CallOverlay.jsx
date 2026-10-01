import { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import CallControls from './CallControls';
import { Phone, Video, AlertCircle } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

const formatDuration = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const CallOverlay = () => {
  const {
    callState,
    callType,
    peerUser,
    callDuration,
    errorMessage,
    localStreamRef,
    remoteStreamRef,
    remoteStream,
    isCameraOff
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Bind local stream to localVideoRef
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef.current, callState, isCameraOff]);

  // Bind remote stream to remoteVideoRef & remoteAudioRef
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch((err) => {
        console.warn('[CallOverlay] Autoplay audio error:', err.message);
      });
    }
  }, [remoteStreamRef.current, remoteStream, callState]);

  if (callState === 'IDLE') return null;

  const isVideo = callType === 'video';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(11, 15, 25, 0.92)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '30px 20px',
      zIndex: 2000,
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* Hidden Audio Element for Playing Remote Audio in Audio & Video Calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      {/* Background Remote Video for Video Call */}
      {isVideo && (callState === 'CONNECTED' || callState === 'CONNECTING') && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          overflow: 'hidden',
          background: '#070a12'
        }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          {/* Floating Local Video Preview Inset */}
          <div style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '140px',
            height: '190px',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            border: '2px solid rgba(255,255,255,0.2)',
            background: '#1e293b',
            zIndex: 10
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
            />
            {isCameraOff && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                color: '#94a3b8'
              }}>
                Cam Off
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Bar: Call Type Badge & Duration */}
      <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '8px 18px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
        {isVideo ? <Video size={16} color="#a855f7" /> : <Phone size={16} color="#10b981" />}
        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
          {isVideo ? 'Raabta Video Call' : 'Raabta Audio Call'}
        </span>
        {callState === 'CONNECTED' && (
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399', marginLeft: '6px' }}>
            • {formatDuration(callDuration)}
          </span>
        )}
      </div>

      {/* Middle Container: Peer Avatar & Call Status Text */}
      <div style={{
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
        margin: 'auto'
      }}>
        {/* Render Peer Avatar if Audio Call or Not Yet Connected */}
        {(!isVideo || callState !== 'CONNECTED') && (
          <div style={{ position: 'relative' }}>
            <img
              src={getMediaUrl(peerUser?.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${peerUser?.username || 'user'}`}
              alt={peerUser?.name || 'User'}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${peerUser?.username || 'user'}`;
              }}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--accent-primary)',
                boxShadow: '0 0 32px var(--accent-glow)'
              }}
            />
            {callState === 'RINGING' && (
              <span className="animate-ping" style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '3px solid #10b981',
                opacity: 0.75
              }} />
            )}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
            {peerUser?.name || peerUser?.username || 'Raabta Contact'}
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
            @{peerUser?.username}
          </p>
        </div>

        {/* Status Pill */}
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 600,
          color: callState === 'CONNECTED' ? '#34d399' : callState === 'FAILED' || callState === 'BUSY' ? '#f87171' : '#a7f3d0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {errorMessage ? (
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} /> {errorMessage}
            </span>
          ) : callState === 'CALLING' ? (
            <span className="animate-pulse">Calling...</span>
          ) : callState === 'RINGING' ? (
            <span className="animate-bounce">Incoming Call...</span>
          ) : callState === 'CONNECTING' ? (
            <span className="animate-pulse">Connecting WebRTC...</span>
          ) : callState === 'CONNECTED' ? (
            <span>Connected</span>
          ) : callState === 'DECLINED' ? (
            <span>Call Declined</span>
          ) : callState === 'BUSY' ? (
            <span>Line Busy</span>
          ) : (
            <span>{callState}</span>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div style={{ zIndex: 10, width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'center' }}>
        <CallControls />
      </div>
    </div>
  );
};

export default CallOverlay;
