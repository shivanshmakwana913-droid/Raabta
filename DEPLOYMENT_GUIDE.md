# 🌐 Raabta App — Permanent 100% Free HTTPS Deployment Guide

This guide details how to get a **permanent, zero-barrier HTTPS link** for your Raabta Chat & Calling App so anyone anywhere in the world can open it on any mobile phone or browser directly without password prompts, flags, or local network limits!

---

## 🚀 Option 1: Permanent 1-Click Production Hosting (Vercel + Render) - RECOMMENDED

### Step 1: Deploy Backend (Render.com) — 100% Free
1. Go to [Render.com](https://render.com) and create a free account.
2. Click **New +** -> **Web Service** -> Connect your GitHub repo (or upload code).
3. Select `backend` directory as Root Directory.
4. Set Build Command: `npm install`
5. Set Start Command: `node server.js`
6. Under **Environment Variables**, add:
   - `MONGODB_URI`: your MongoDB Atlas URI
   - `JWT_SECRET`: your secret key
   - `CLIENT_URL`: your frontend Vercel URL (e.g. `https://raabta-chat.vercel.app`)
7. Click **Create Web Service**. Render gives you a permanent HTTPS backend link (e.g., `https://raabta-backend.onrender.com`).

---

### Step 2: Deploy Frontend (Vercel.com) — 100% Free
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Select `frontend` directory.
3. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://raabta-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://raabta-backend.onrender.com`
4. Click **Deploy**!
5. Vercel gives you a permanent HTTPS link (e.g., `https://raabta-chat.vercel.app`).

> 🌟 **Result**: You get a permanent, beautiful `https://raabta-chat.vercel.app` link. Share it with anyone, anywhere in the world. Camera, Microphone, WebSockets, Audio/Video calls work 100% seamlessly on any smartphone!

---

## ⚡ Option 2: Standing Cloudflare Tunnel (Zero-Password Tunnel)

If you want to stream from your local PC to any mobile phone globally over a secure HTTPS link without deployment:

1. Download [Cloudflared CLI](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Run this command in your PC terminal:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
3. Cloudflare generates a permanent-style link (e.g. `https://random-name.trycloudflare.com`).
4. **No Password / No White Screen!** Open this link on any mobile phone — full WebRTC camera & mic work out-of-the-box!

---

## 📱 Mobile UI Features Supported:
- **Responsive Layout**: Auto-toggles between Sidebar & Active Chat window on mobile.
- **Docked Keyboard Emoji Picker**: Emoji, GIF & Sticker pickers dock cleanly directly above the message bar (`bottom: 74px`).
- **WebRTC Audio & Video Calls**: Native P2P media streaming with camera & mic controls.
