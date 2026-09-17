const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const audioFileFilter = (req, file, cb) => {
  const allowedAudioMimeTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/x-m4a',
    'audio/m4a',
    'audio/3gpp',
    'video/webm'
  ];
  if (allowedAudioMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio file type. Only audio recordings are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit for images
  fileFilter
});

const uploadAudio = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit for audio
  fileFilter: audioFileFilter
});

const fs = require('fs');
const path = require('path');

const saveToLocalStorage = (fileBuffer, extension = 'jpg') => {
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, fileBuffer);
  return {
    url: `http://localhost:5000/uploads/${filename}`,
    publicId: `local_${filename}`
  };
};

const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  if (cloudName === 'demo_cloud' || apiSecret === 'your_cloudinary_api_secret' || apiKey === '123456789012345') return false;
  return true;
};

// Helper to stream image upload buffer to Cloudinary with local fallback
const uploadToCloudinary = (fileBuffer, folder = 'chat_uploads', extension = 'jpg') => {
  if (!isCloudinaryConfigured()) {
    console.log('[Upload] Cloudinary credentials invalid or missing. Using local file storage fallback.');
    return Promise.resolve(saveToLocalStorage(fileBuffer, extension));
  }

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.warn('[Cloudinary Error] Falling back to local storage:', error.message);
          return resolve(saveToLocalStorage(fileBuffer, extension));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper to stream audio upload buffer to Cloudinary with local fallback
const uploadAudioToCloudinary = (fileBuffer, folder = 'chat_voice_messages', extension = 'webm') => {
  if (!isCloudinaryConfigured()) {
    console.log('[Upload Audio] Cloudinary credentials invalid or missing. Using local file storage fallback.');
    return Promise.resolve(saveToLocalStorage(fileBuffer, extension));
  }

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video'
      },
      (error, result) => {
        if (error) {
          console.warn('[Cloudinary Audio Error] Falling back to local storage:', error.message);
          return resolve(saveToLocalStorage(fileBuffer, extension));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration || 0
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadAudio,
  uploadToCloudinary,
  uploadAudioToCloudinary
};
