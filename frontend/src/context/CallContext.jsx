import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

// STUN servers list, overridable via import.meta.env.VITE_ICE_SERVERS
const getIceServers = () => {
  const customIce = import.meta.env.VITE_ICE_SERVERS;
  if (customIce) {
    try {
      return JSON.parse(customIce);
    } catch {
      console.warn('[CallContext] Invalid VITE_ICE_SERVERS JSON, using fallback STUN.');
    }
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];
};

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Call States: 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'DECLINED' | 'BUSY' | 'ENDED' | 'FAILED' | 'TIMEOUT'
  const [callState, setCallState] = useState('IDLE');
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [callId, setCallId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [peerUser, setPeerUser] = useState(null); // { _id, name, username, avatar }
  
  // Media Controls & Stream State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // References
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const callTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const ringtoneAudioCtxRef = useRef(null);
  const ringtoneOscRef = useRef(null);

  // Refs for event listener closure stability
  const callIdRef = useRef(callId);
  const peerUserRef = useRef(peerUser);
  const callStateRef = useRef(callState);

  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { peerUserRef.current = peerUser; }, [peerUser]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // -------------------------------------------------------------
  // Ringtone / Audio Tone Generators (Web Audio API)
  // -------------------------------------------------------------
  const stopAudioTones = useCallback(() => {
    if (ringtoneOscRef.current) {
      try { ringtoneOscRef.current.stop(); } catch {}
      ringtoneOscRef.current = null;
    }
    if (ringtoneAudioCtxRef.current) {
      try { ringtoneAudioCtxRef.current.close(); } catch {}
      ringtoneAudioCtxRef.current = null;
    }
  }, []);

  const playOutgoingCallingTone = useCallback(() => {
    stopAudioTones();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneAudioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard 440Hz ringback tone

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringtoneOscRef.current = osc;
    } catch (err) {
      console.warn('[CallContext] Outgoing tone error:', err.message);
    }
  }, [stopAudioTones]);

  const playIncomingRingtone = useCallback(() => {
    stopAudioTones();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneAudioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringtoneOscRef.current = osc;
    } catch (err) {
      console.warn('[CallContext] Incoming ringtone error:', err.message);
    }
  }, [stopAudioTones]);

  // -------------------------------------------------------------
  // Cleanup WebRTC Connection & Streams
  // -------------------------------------------------------------
  const cleanupCall = useCallback(() => {
    stopAudioTones();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    setIsMicMuted(false);
    setIsCameraOff(false);
    setRemoteStream(null);
  }, [stopAudioTones]);

  const resetToIdle = useCallback(() => {
    cleanupCall();
    setCallState('IDLE');
    setCallId(null);
    setConversationId(null);
    setPeerUser(null);
    setCallDuration(0);
    setErrorMessage(null);
    callIdRef.current = null;
    peerUserRef.current = null;
    callStateRef.current = 'IDLE';
  }, [cleanupCall]);

  // -------------------------------------------------------------
  // WebRTC PeerConnection Setup
  // -------------------------------------------------------------
  const createPeerConnection = useCallback((targetUserIdStr, currentCallIdStr) => {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers()
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          callId: currentCallIdStr || callIdRef.current,
          targetUserId: targetUserIdStr || peerUserRef.current?._id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    const handleConnectionState = () => {
      const isConnected =
        pc.connectionState === 'connected' ||
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed';

      if (isConnected) {
        stopAudioTones();
        setCallState('CONNECTED');
        callStateRef.current = 'CONNECTED';
        if (!callTimerRef.current) {
          setCallDuration(0);
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (
        pc.connectionState === 'failed' ||
        pc.iceConnectionState === 'failed'
      ) {
        setErrorMessage('Peer-to-peer connection failed.');
        setCallState('FAILED');
        setTimeout(resetToIdle, 3000);
      }
    };

    pc.onconnectionstatechange = handleConnectionState;
    pc.oniceconnectionstatechange = handleConnectionState;

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, stopAudioTones, resetToIdle]);

  // -------------------------------------------------------------
  // Call Controls & Methods
  // -------------------------------------------------------------

  // Initiate Outgoing Call
  const startCall = async ({ conversationId: convId, targetUser, callType: cType }) => {
    if (callStateRef.current !== 'IDLE') return;
    if (!socket || !socket.connected) {
      alert('Network socket disconnected. Please check your internet connection.');
      return;
    }

    setErrorMessage(null);
    setCallType(cType);
    setConversationId(convId);
    setPeerUser(targetUser);
    peerUserRef.current = targetUser;
    setCallState('CALLING');
    callStateRef.current = 'CALLING';
    playOutgoingCallingTone();

    // Acquire Local Media Stream
    try {
      const constraints = {
        audio: true,
        video: cType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
    } catch (err) {
      console.error('[CallContext] Media permission error:', err.message);
      stopAudioTones();
      setErrorMessage('Microphone/Camera permission denied or device unsupported.');
      setCallState('FAILED');
      setTimeout(resetToIdle, 3500);
      return;
    }

    // Emit Socket Initiate Event
    socket.emit(
      'call:initiate',
      {
        conversationId: convId,
        targetUserId: targetUser._id,
        callType: cType
      },
      (response) => {
        if (!response || response.status !== 'ok') {
          stopAudioTones();
          if (response?.status === 'busy') {
            setCallState('BUSY');
            setErrorMessage('User is currently on another call.');
          } else if (response?.status === 'offline') {
            setCallState('ENDED');
            setErrorMessage('User is currently offline.');
          } else {
            setCallState('FAILED');
            setErrorMessage(response?.message || 'Failed to connect call.');
          }
          setTimeout(resetToIdle, 3000);
          return;
        }

        setCallId(response.callId);
        callIdRef.current = response.callId;

        // Set 30-Second Unanswered Timeout
        timeoutTimerRef.current = setTimeout(() => {
          if (socket) {
            socket.emit('call:end', { callId: response.callId, reason: 'timeout' });
          }
          stopAudioTones();
          setCallState('TIMEOUT');
          setErrorMessage('No answer.');
          setTimeout(resetToIdle, 3000);
        }, 30000);
      }
    );
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    const activeCallId = callIdRef.current || callId;
    const activePeer = peerUserRef.current || peerUser;
    if (!activeCallId || !activePeer) return;
    stopAudioTones();
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

    setCallState('CONNECTING');
    callStateRef.current = 'CONNECTING';

    // Acquire Local Media Stream
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
    } catch (err) {
      console.error('[CallContext] Accept call media permission error:', err.message);
      if (socket) socket.emit('call:decline', { callId: activeCallId, reason: 'permission_denied' });
      setErrorMessage('Microphone/Camera permission denied.');
      setCallState('FAILED');
      setTimeout(resetToIdle, 3000);
      return;
    }

    // Create RTCPeerConnection & add local tracks
    const pc = createPeerConnection(activePeer._id, activeCallId);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Emit Socket call:accept
    socket.emit('call:accept', { callId: activeCallId }, async (res) => {
      if (res && res.status !== 'ok') {
        setErrorMessage('Call no longer available.');
        setCallState('ENDED');
        setTimeout(resetToIdle, 2500);
      }
    });
  };

  // Decline Incoming Call
  const declineCall = () => {
    const activeCallId = callIdRef.current || callId;
    if (activeCallId && socket) {
      socket.emit('call:decline', { callId: activeCallId, reason: 'declined' });
    }
    stopAudioTones();
    setCallState('DECLINED');
    setTimeout(resetToIdle, 1500);
  };

  // End Active / Outgoing Call
  const endCall = () => {
    const activeCallId = callIdRef.current || callId;
    if (activeCallId && socket) {
      socket.emit('call:end', { callId: activeCallId, reason: 'ended' });
    }
    stopAudioTones();
    setCallState('ENDED');
    setTimeout(resetToIdle, 1500);
  };

  // Toggle Microphone Mute
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks[0].enabled = nextState;
        setIsMicMuted(!nextState);
      }
    }
  };

  // Toggle Camera On/Off
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks[0].enabled = nextState;
        setIsCameraOff(!nextState);
      }
    }
  };

  // -------------------------------------------------------------
  // Socket Call Event Listeners
  // -------------------------------------------------------------
  useEffect(() => {
    if (!socket || !user) return;

    // Incoming Call Prompt
    const handleIncomingCall = (data) => {
      const { callId: inCallId, conversationId: inConvId, caller, callType: inType } = data || {};
      
      if (callStateRef.current !== 'IDLE') {
        socket.emit('call:decline', { callId: inCallId, reason: 'busy' });
        return;
      }

      setCallId(inCallId);
      callIdRef.current = inCallId;
      setConversationId(inConvId);
      setPeerUser(caller);
      peerUserRef.current = caller;
      setCallType(inType);
      setCallState('RINGING');
      callStateRef.current = 'RINGING';
      playIncomingRingtone();

      timeoutTimerRef.current = setTimeout(() => {
        stopAudioTones();
        setCallState('TIMEOUT');
        setTimeout(resetToIdle, 2500);
      }, 30000);
    };

    // Caller receives Acceptance -> Send WebRTC Offer
    const handleCallAccepted = async (data) => {
      const { callId: accCallId } = data || {};
      const activeCallId = callIdRef.current || callId;
      const targetUser = peerUserRef.current || peerUser;
      if (accCallId && activeCallId && accCallId !== activeCallId) return;

      stopAudioTones();
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      setCallState('CONNECTING');
      callStateRef.current = 'CONNECTING';

      const pc = createPeerConnection(targetUser?._id, activeCallId);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
          callId: activeCallId,
          targetUserId: targetUser?._id,
          sdp: pc.localDescription
        });
      } catch (err) {
        console.error('[CallContext] Create offer error:', err.message);
        endCall();
      }
    };

    // Receive WebRTC SDP Offer -> Create SDP Answer
    const handleCallOffer = async (data) => {
      const { sdp, callerUserId, callId: offerCallId } = data || {};
      const pc = peerConnectionRef.current;
      const activeCallId = offerCallId || callIdRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:answer', {
          callId: activeCallId,
          targetUserId: callerUserId,
          sdp: pc.localDescription
        });

        // Drain any stored ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
      } catch (err) {
        console.error('[CallContext] Handle offer error:', err.message);
      }
    };

    // Receive WebRTC SDP Answer
    const handleCallAnswer = async (data) => {
      const { sdp } = data || {};
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
      } catch (err) {
        console.error('[CallContext] Handle answer error:', err.message);
      }
    };

    // Receive ICE Candidate
    const handleIceCandidate = async (data) => {
      const { candidate } = data || {};
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[CallContext] Add ICE candidate error:', err.message);
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    };

    // Call Declined
    const handleCallDeclined = () => {
      stopAudioTones();
      setCallState('DECLINED');
      setErrorMessage('Call declined');
      setTimeout(resetToIdle, 2500);
    };

    // Call Busy
    const handleCallBusy = () => {
      stopAudioTones();
      setCallState('BUSY');
      setErrorMessage('User is on another call');
      setTimeout(resetToIdle, 2500);
    };

    // Call Ended
    const handleCallEnded = () => {
      stopAudioTones();
      setCallState('ENDED');
      setTimeout(resetToIdle, 2000);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:busy', handleCallBusy);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:busy', handleCallBusy);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, user, createPeerConnection, stopAudioTones, playIncomingRingtone, resetToIdle, endCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callId,
        conversationId,
        peerUser,
        isMicMuted,
        isCameraOff,
        callDuration,
        errorMessage,
        localStreamRef,
        remoteStreamRef,
        remoteStream,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMic,
        toggleCamera
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
