# Raabta

> **Raabta is a real-time social messaging platform built with React, Node.js, Express, MongoDB and Socket.IO.**
> *"Jahan baatein judti hain."*

---

## 1. Overview

**Raabta** is an open-source, full-stack real-time social messaging platform designed for fast, seamless, and secure communication. Built as an independent project to demonstrate modern production-grade architecture, it supports case-insensitive unique username identities (`@username`), direct 1-on-1 messaging, group chats, message replies, inline text editing, soft-deletion, emoji reactions, instant full-text message search, image attachments via Cloudinary, privacy controls, and live presence/typing indicators.

---

## 2. Features

- 👤 **Case-Insensitive Unique Username System**: Every user gets a unique `@username` with live availability checks.
- 📱 **Phone Identity & OTP Authentication**: Optional phone number registration, 6-digit OTP verification, and phone login tabs.
- 🔑 **Flexible Authentication**: Log in using Email, Username, or Verified Phone Number with secure 6-digit OTP codes.
- ⚙️ **Account Settings & Safety**: Complete settings modal for profile editing, password changes (`PUT /api/auth/change-password`), and private phone number verification/management.
- 🛡️ **User Blocking & Moderation**: Block/unblock abusive users (`POST /api/users/block/:id`) to prevent unwanted direct messaging.
- 🚩 **User & Message Reporting**: Complaint reporting pipeline (`POST /api/reports`) for Spam, Harassment, Abuse, and Inappropriate Content.
- 👁️ **Granular Privacy Controls**: Custom privacy settings for Last Seen, Online Status, and Public Profile details (`PUT /api/users/privacy`).
- 🗑️ **Safe Account Deletion**: Password-confirmed account deletion (`DELETE /api/users/account`) with profile anonymization to preserve shared thread integrity.
- 💬 **Direct & Group Messaging**: Instant 1-on-1 chats and multi-user group conversations with admin privileges.
- ⚡ **Real-Time Websocket Engine**: Ultra-low latency bidirectional message dispatching powered by Socket.IO.
- 👁️ **Delivery & Read Receipts**: Real-time single tick (sent), double tick (delivered), and blue tick (seen) statuses.
- ✍️ **Typing Indicators & Online Presence**: Live typing states and user online/offline status with `Last seen` timestamps.
- 🖼️ **Image Attachment & Lightbox**: Image uploading via Cloudinary with full-screen lightbox preview.
- 🔄 **Message Actions**: Quote replies, text message editing (`edited` tag), soft deletion, and emoji reactions (`❤️`, `👍`, `😂`, `😮`, `😢`, `🔥`).
- 🔍 **Multi-Mode Instant Search**: Search chats, global message text history, and user directory.
- 🌐 **Public Profile Identity**: Shareable public profile route (`/u/:username`) for fast identity discovery.
- 🔔 **In-App & Browser Notifications**: Instant audio cues and native Web Notifications.
- 🛡️ **Security Hardened**: Password hashing via bcrypt, rate-limiting, CORS origin isolation, and input sanitization against NoSQL injection.

---

## 3. Screenshots

*(Place application screenshots or animated GIFs here)*

| Direct Chat Interface | Public User Profile | Group Info & Admin Tools |
| :---: | :---: | :---: |
| `![Chat Window Placeholder](https://via.placeholder.com/600x400?text=Direct+Chat+Window)` | `![Public Profile Placeholder](https://via.placeholder.com/600x400?text=Public+Profile+/u/username)` | `![Group Modal Placeholder](https://via.placeholder.com/600x400?text=Group+Management)` |

---

## 4. Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ORM (indexing, schemas, validations)
- **Real-Time Protocol**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Cloudinary SDK & Multer memory storage
- **Rate Limiting**: `express-rate-limit`

### Frontend
- **Framework**: React 19 (Hooks, Context API)
- **Build Tool & Dev Server**: Vite
- **Routing**: React Router DOM v7
- **UI Components**: Lucide React Icons & Modern Glassmorphism CSS design system
- **HTTP Client**: Axios with interceptors
- **Real-Time Client**: Socket.IO Client

---

## 5. Architecture

```text
[ React Frontend (Vite) ]
   ├── REST API Calls (Axios) ────────► [ Express Server ] ──► [ MongoDB Atlas ]
   └── WebSockets (Socket.IO) ───────► [ Socket Handler ] ──► [ Cloudinary Media ]
```

---

## 6. Core Features

- Modern responsive 2-column layout (Sidebar + Active Chat Container).
- Dynamic layout adaptation for mobile viewports (320px–414px).
- Instant real-time UI synchronization across multiple open tabs and devices.

---

## 7. Authentication

- **Registration**: Requires full name, unique `@username`, valid email address, and strong password (min 6 chars).
- **Login**: Supports sign in using **Email OR Username**.
- **Security**: Passwords encrypted with bcrypt salt factor 10. Passwords excluded from database queries (`select: false`).
- **Stateless Tokens**: JWT authorization bearer headers used for REST and Socket.IO handshakes.

---

## 8. Real-Time Messaging

- **Socket Events**: `send_message`, `receive_message`, `message_delivered`, `message_seen`, `typing`, `stop_typing`, `user_status_changed`.
- **Persistent Storage**: All messages stored in MongoDB with sender, conversation ID, status logs, and timestamps.
- **Auto Reconnection**: Room re-joining on network interruption.

---

## 9. Groups

- Create custom group chats with group avatar, title, and description.
- Admin controls: Add members, remove members, promote to admin, update group settings.
- System notifications for member join/leave events.

---

## 10. Message Actions

- **Reply**: Quote original message content with jump context.
- **Edit**: Edit sent text messages within active session. Appends an `(edited)` tag.
- **Delete**: Soft-delete messages (`"This message was deleted"`).
- **Reactions**: Add/remove interactive emoji reactions with live count badges.

---

## 11. Search

- **Chats Tab**: Local instant filtering of active 1-on-1 and group chats.
- **Messages Tab**: Global regex keyword search across entire conversation history.
- **Users Tab**: Case-insensitive directory search by name or `@username`.

---

## 12. Notifications

- Sound alerts for incoming messages when chat window is not focused.
- Native browser desktop notifications (HTML5 Notification API).
- Unread badge counters per conversation item.

---

## 13. Image Uploads

- Drag-and-drop or file selector image attachments (up to 5MB).
- Uploaded directly to Cloudinary cloud storage with fallback local/remote previews.
- Fullscreen modal lightbox viewer with zoom/close controls.

---

## 14. Security

- Case-insensitive normalized unique MongoDB database index (`normalizedUsername`).
- Protection against NoSQL and Regex injection via query escaping.
- Password fields deleted before JSON serialization (`toJSON` transform).
- CORS strict origin validation via `CLIENT_URL`.
- Express rate limiting enabled on authentication endpoints.

---

## 15. Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/chat_db?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_random_jwt_key
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 16. Local Development

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- MongoDB Atlas account or local MongoDB server

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/REAL-TIME-CHAT-APP.git
   cd REAL-TIME-CHAT-APP
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update backend/.env with your MongoDB & Cloudinary credentials
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

4. **Access App**: Open `http://localhost:5173` in your browser.

---

## 17. Production Deployment

Refer to [`DEPLOYMENT.md`](file:///c:/Users/HP/Desktop/REAL-TIME-CHAT-APP/DEPLOYMENT.md) for detailed deployment instructions on cloud providers such as Render, Vercel, Railway, or DigitalOcean.

---

## 18. Future Roadmap

- 📞 **End-to-End Encrypted Voice & Video Calling** (WebRTC integration)
- 🔒 **End-to-End Message Encryption (E2EE)** using Signal protocol / Signal Protocol JS
- 📱 **Mobile Native Apps** (React Native / Flutter)
- 📌 **Pinned Messages & Starred Conversations**
- 🎙️ **Voice Notes & Audio Recording Attachments**

---

## 19. Contributing

Contributions, issues, and feature requests are welcome! Please read [`CONTRIBUTING.md`](file:///c:/Users/HP/Desktop/REAL-TIME-CHAT-APP/CONTRIBUTING.md) for details on our code of conduct and submitting pull requests.

---

## 20. License

This project is licensed under the MIT License - see the [`LICENSE`](file:///c:/Users/HP/Desktop/REAL-TIME-CHAT-APP/LICENSE) file for details.
