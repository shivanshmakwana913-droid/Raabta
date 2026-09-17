import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react';
import { useCall } from '../../context/CallContext';

const CallControls = () => {
  const {
    callState,
    callType,
    isMicMuted,
    isCameraOff,
    toggleMic,
    toggleCamera,
    endCall,
    acceptCall,
    declineCall
  } = useCall();

  if (callState === 'IDLE') return null;

  // Incoming Call controls
  if (callState === 'RINGING') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginTop: '24px' }}>
        <button
          onClick={declineCall}
          className="call-btn-danger"
          title="Decline Call"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            transition: 'transform 0.15s ease'
          }}
        >
          <PhoneOff size={26} />
        </button>

        <button
          onClick={acceptCall}
          className="call-btn-success"
          title="Accept Call"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Phone size={28} />
        </button>
      </div>
    );
  }

  // Active or Outgoing Call controls
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      padding: '14px 24px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      borderRadius: '30px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Mic Mute Toggle */}
      <button
        onClick={toggleMic}
        title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: isMicMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>

      {/* Camera Toggle (Video Call Only) */}
      {callType === 'video' && (
        <button
          onClick={toggleCamera}
          title={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isCameraOff ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      )}

      {/* End Call Button */}
      <button
        onClick={endCall}
        title="End Call"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
          transition: 'transform 0.15s ease'
        }}
      >
        <PhoneOff size={24} />
      </button>
    </div>
  );
};

export default CallControls;
