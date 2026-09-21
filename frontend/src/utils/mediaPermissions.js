/**
 * Pre-request and test microphone and camera browser permissions.
 * Prompts user for browser media access and immediately releases test tracks.
 */
export const requestMediaPermissions = async (options = { audio: true, video: true }) => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      success: false,
      error: 'Browser does not support microphone or camera media access.'
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(options);
    // Release test tracks immediately
    stream.getTracks().forEach((track) => track.stop());

    return {
      success: true,
      audioGranted: options.audio,
      videoGranted: options.video
    };
  } catch (err) {
    console.warn('[MediaPermissions] Permission request rejected or failed:', err.name, err.message);
    let userFriendlyError = 'Microphone & Camera permission denied by browser.';

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      userFriendlyError = 'Permission denied. Please click the lock/settings icon in your browser address bar to allow Microphone & Camera access.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      userFriendlyError = 'No microphone or camera device found on your system.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      userFriendlyError = 'Microphone or Camera is currently in use by another application.';
    }

    return {
      success: false,
      error: userFriendlyError,
      rawError: err.name
    };
  }
};


