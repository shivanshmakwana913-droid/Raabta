const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    normalizedUsername: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: '',
      maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    privacySettings: {
      lastSeen: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone'
      },
      onlineStatus: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone'
      },
      profile: {
        type: String,
        enum: ['everyone', 'users'],
        default: 'everyone'
      }
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    phoneNumber: {
      type: String,
      default: null,
      trim: true
    },
    phoneNumberVerified: {
      type: Boolean,
      default: false
    },
    phoneNumberVerifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Ensure normalizedUsername is populated before validation & save
userSchema.pre('validate', function (next) {
  if (this.username) {
    this.normalizedUsername = this.username.trim().toLowerCase();
  }
  if (typeof next === 'function') next();
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function () {
  if (this.username) {
    this.normalizedUsername = this.username.trim().toLowerCase();
  }
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Helper to normalize phone numbers (E.164 format e.g. +1234567890)
userSchema.statics.normalizePhoneNumber = function (phone) {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

// Custom transform to prevent password and phone number leakage in public profiles/search
userSchema.set('toJSON', {
  transform: (doc, ret, options) => {
    delete ret.password;
    delete ret.normalizedUsername;
    if (!options || !options.includePhone) {
      delete ret.phoneNumber;
    }
    return ret;
  }
});

userSchema.index({ normalizedUsername: 1 }, { unique: true });
userSchema.index({ name: 1, username: 1 });
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
