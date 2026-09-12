# Raabta — Production Deployment Guide

This guide provides provider-neutral, step-by-step instructions for deploying the Raabta real-time social messaging platform to production.

---

## 1. Required Production Environment Variables

### Backend Environment Variables (`backend/.env`)

| Variable Name | Description | Example / Placeholder |
| :--- | :--- | :--- |
| `PORT` | Node server port (automatically set by most cloud hosts like Render/Railway/Heroku) | `5000` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/chat_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | Strong, random secret string for JWT token generation | `your_secure_random_jwt_secret_key_32_chars` |
| `CLIENT_URL` | Deployed Frontend Application URL (used for CORS restriction) | `https://your-frontend-domain.com` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Cloud Name | `your_cloudinary_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your_cloudinary_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret (Keep confidential on backend only!) | `your_cloudinary_api_secret` |
| `OTP_PROVIDER` | OTP service provider mode (`mock` for development, `twilio` for production) | `mock` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (Optional for production SMS delivery) | `your_twilio_account_sid` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (Optional for production SMS delivery) | `your_twilio_auth_token` |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number (Optional for production SMS delivery) | `+1234567890` |
| `NODE_ENV` | Environment mode (suppresses internal stack traces in errors) | `production` |

### Frontend Environment Variables (`frontend/.env`)

| Variable Name | Description | Example / Placeholder |
| :--- | :--- | :--- |
| `VITE_API_URL` | Deployed Backend REST API Base URL | `https://your-backend-domain.com/api` |
| `VITE_SOCKET_URL` | Deployed Backend Socket.IO URL | `https://your-backend-domain.com` |

> **IMPORTANT**: Never hardcode real credentials or secrets in source code or commit `.env` files to git repository.

---

## 2. Component Setup & Configuration

### A. MongoDB Atlas Database Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User with read/write credentials under **Database Access**.
3. Under **Network Access**, add `0.0.0.0/0` to allow connection from hosting providers (or restrict to your backend host IP).
4. Copy the connection string format:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/realtime_chat_app?retryWrites=true&w=majority`
5. Place this URI into the backend host environment variable `MONGODB_URI`.

### B. Cloudinary Media Storage Setup
1. Register for a free account at [Cloudinary](https://cloudinary.com).
2. Navigate to Dashboard and retrieve:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Configure these 3 keys as environment variables in the backend service configuration.
4. Verify backend Multer memory storage handles images up to 5MB (`JPEG`, `PNG`, `WebP`).

### C. CORS Configuration
- In `backend/server.js`, CORS is configured via `process.env.CLIENT_URL`:
  ```javascript
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }));
  ```
- Ensure `CLIENT_URL` strictly matches your frontend domain in production.

### D. Socket.IO Production Setup
- Socket.IO server uses WebSocket and fallback Polling transports.
- Make sure cloud providers support WebSockets (e.g., Render, Railway, DigitalOcean App Platform, Fly.io all support WebSockets natively).
- Frontend `SocketContext` automatically connects to `VITE_SOCKET_URL` using JWT authorization handshakes.

### E. Twilio Real SMS OTP Setup (Production)
1. Sign up for a [Twilio Account](https://www.twilio.com/).
2. Obtain your **Account SID**, **Auth Token**, and a verified **Twilio Phone Number** from the Twilio Console.
3. Configure the following environment variables in your backend environment:
   - `OTP_PROVIDER=twilio`
   - `TWILIO_ACCOUNT_SID=your_account_sid`
   - `TWILIO_AUTH_TOKEN=your_auth_token`
   - `TWILIO_PHONE_NUMBER=+1234567890`
4. If Twilio credentials are not configured or invalid, the backend will return clean user-friendly error messages without exposing secret keys or raw stack traces.
5. In local development environments, keep `OTP_PROVIDER=mock` to test phone login & verification without incurring SMS charges.


---

## 3. Step-by-Step Deployment Instructions

### Option A: Deploying Backend (Node.js / Express)
1. Push project code to a remote git repository (GitHub/GitLab).
2. Create a **Web Service** on your hosting provider (e.g. Render, Railway, Heroku, AWS Elastic Beanstalk).
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node server.js`
6. Add all required backend environment variables (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `CLOUDINARY_*`, `NODE_ENV=production`).
7. Deploy the service and record the generated backend URL (e.g., `https://your-backend-service.onrender.com`).

### Option B: Deploying Frontend (React / Vite)
1. Create a **Static Site** on your hosting provider (e.g. Vercel, Netlify, Render Static Site, Cloudflare Pages).
2. Set **Root Directory**: `frontend`
3. Set **Build Command**: `npm run build`
4. Set **Output Directory**: `dist`
5. Set **Build Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend-service.onrender.com`
6. Configure single-page application (SPA) rewrite rule so all non-asset requests route to `/index.html`.
7. Deploy the frontend and copy the deployed URL (e.g., `https://your-app.vercel.app`).
8. Update the backend `CLIENT_URL` environment variable to `https://your-app.vercel.app` to finalize CORS matching.

---

## 4. Post-Deployment Verification Checklist

Before releasing to end users, perform the following verification pass:

- [ ] **Backend Health Endpoint**: Open `https://your-backend-domain.com/api/health` and verify `{ "status": "ok" }` response.
- [ ] **Frontend Application Loading**: Open frontend URL in browser and verify layout renders without console errors.
- [ ] **Authentication**: Register a new user and test login with JWT token issue.
- [ ] **Direct 1-on-1 Chat**: Create chat between 2 users and test real-time message sending.
- [ ] **Group Chat**: Create a group chat, add members, update group title, and test group messaging.
- [ ] **Socket.IO Real-Time Connection**: Verify instant message receipt without page reload.
- [ ] **Typing Indicators**: Test real-time typing indicators in direct and group chats.
- [ ] **User Presence**: Test online/offline status badge and `Last seen` timestamp updates.
- [ ] **Delivery & Read Receipts**: Verify single tick (sent), double tick (delivered), and blue tick (seen) statuses.
- [ ] **Image Sharing**: Upload an image attachment and verify Cloudinary upload and lightbox preview.
- [ ] **Message Actions**: Test reply quotes, text editing, soft-deletion, and emoji reactions.
- [ ] **Search System**: Test instant conversation filtering, global text message search, and user search.
- [ ] **In-App & Browser Notifications**: Verify incoming message toasts for non-selected chats.
- [ ] **Socket Reconnection**: Disconnect/reconnect network and verify automatic room re-joining.
- [ ] **Mobile Responsiveness**: Verify responsive UI on mobile widths (320px–414px).
- [ ] **CORS Verification**: Confirm unauthorized origins cannot query REST API endpoints.
