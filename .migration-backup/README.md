<p align="center">
  <img src="public/logo.png" alt="AniXo Logo" width="200" />
</p>

# <p align="center">🎌 AniXo - The Next-Gen Anime Experience 🎌</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Python-3.10-green?style=for-the-badge&logo=python" alt="Python 3.10" />
  <img src="https://img.shields.io/badge/Flask-Framework-black?style=for-the-badge&logo=flask" alt="Flask" />
  <img src="https://img.shields.io/badge/Vercel-Deployment-white?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

> [!CAUTION]
> **Self-hosting this application is strictly limited to personal use only.** Commercial utilization is prohibited, and the inclusion of advertisements on your self-hosted website may lead to serious consequences, including potential site takedown measures. Ensure compliance to avoid any legal or operational issues.

---

## 📸 Interface Preview

<p align="center">
  
  <br>

</p>

<p align="center">
  
  <br>
  <i>Advanced Filtering & Discovery System</i>
</p>

---

## 🌌 Overview

**AniXo** is a high-performance, premium anime streaming platform built for speed, aesthetics, and reliability. It bridges the gap between multiple metadata providers (AniList, MAL, Kitsu) and high-quality streaming sources to deliver a seamless, ad-free watching experience.

Unlike traditional platforms, AniXo features a **Hybrid Resilience Engine**—ensuring the platform remains functional even during major third-party API outages.

---

## 🏗️ Architectural Blueprint

The system is split into three core layers designed for maximum scalability and zero downtime.

```text
anixo/
├── api/                        # 🚀 Unified Backend (Python & Node.js)
│   ├── index.py                # 🐍 Python API (Jikan/AniList Proxy)
│   ├── user.js                 # 🟢 Node.js Auth & Watchlist Gateway
│   ├── comments.json           # 💬 Local Database (Comments)
│   └── stream_cache.json       # ⚡ Scraper Performance Cache
├── src/                        # ⚛️ Frontend (React 19 + Vite)
│   ├── pages/                  # 🖼️ Application Views (Pages)
│   │   ├── AnimeDetails.jsx    # Anime Info & Metadata
│   │   ├── Browse.jsx          # Advanced Filtering & Discovery
│   │   ├── Watch.jsx           # Core Streaming Experience
│   │   ├── Home.jsx            # Dynamic Hero & Trending Rails
│   │   ├── Profile.jsx         # User Dashboard
│   │   ├── Watchlist.jsx       # Personal List Management
│   │   ├── Schedule.jsx        # Airing Timetable
│   │   ├── Character.jsx       # Character Specific Info
│   │   ├── Staff.jsx           # Production Staff Info
│   │   ├── Notifications.jsx   # User Alerts & Updates
│   │   ├── ContinueWatching.jsx# Progress Tracking View
│   │   ├── ImportExport.jsx    # AniList/MAL Data Portability
│   │   ├── Settings.jsx        # App Preferences
│   │   ├── Portal.jsx          # User Entry Point (Login/Signup)
│   │   ├── ForgotPassword.jsx  # Account Recovery Initiation
│   │   ├── ResetPassword.jsx   # Secure Password Update
│   │   ├── DMCA.jsx            # Legal Information
│   │   └── TermsOfService.jsx  # Terms & Conditions
│   ├── components/             # 🧱 UI Building Blocks
│   │   ├── layout/             # Navbar, Footer, Sidebar
│   │   ├── common/             # AnimeCard, VideoPlayer, Pagination
│   │   ├── auth/               # Login & Registration Components
│   │   ├── home/               # Featured Content & Carousels
│   │   └── user/               # Profile & List Components
│   ├── services/               # 📡 API Connectors (api.js, auth.js)
│   ├── hooks/                  # 🪝 Custom Logic & State Hooks
│   └── context/                # 🌐 Global Auth & UI State
├── public/                     # 📂 Static Assets (Icons, Logos)
├── vercel.json                 # 🌍 Serverless Deployment Logic
├── vite.config.js              # ⚡ Fast Build & Proxy Setup
├── requirements.txt            # 🐍 Python Dependencies
└── .env.example                # 🔒 Setup Template
```

---

## 🌟 Premium Features

### 🛡️ Hybrid Resilience Engine
- **Intelligent Fallback:** Automatically switches to **Jikan (MAL)** if AniList goes down.
- **Dynamic Normalization:** Jikan data is transformed on-the-fly to match the AniList schema, preventing UI breaks.
- **Broadcast Timing:** Live-synced broadcast schedules displayed directly in the Watch page.

### 🎬 Elite Streaming Experience
- **Multi-Server Resolution:** Seamlessly switches between high-quality streaming providers like Megaplay and Miruro.
- **Smart Metadata:** Episode thumbnails and descriptions are intelligently pulled from Kitsu/MAL for a "Netflix-style" browse experience.
- **Native HLS Player:** High-performance playback with Auto-Skip (Intro/Outro) support.

### 🔐 Advanced Security & Recovery
- **Token-Based Recovery:** Secure "Forgot Password" flow with high-entropy, hashed reset tokens.
- **Gmail SMTP Integration:** Professional, dark-themed HTML email templates for account recovery.
- **Real-time Verification:** Mandatory current password check and real-time strength indicators.
- **Cloudflare Turnstile:** Bot protection integrated into the login/registration process.

---

## 📡 API Reference & Proxy Logic

### 🐍 Python Scraper API (`/api/index.py`)

#### 🚀 Example Discovery Flow
| Order | Action | Endpoint | Purpose |
| :--- | :--- | :--- | :--- |
| **0** | **Proxy** | `POST /api/anilist/proxy` | GraphQL Proxy with **Jikan Fallback**. |
| **1** | **Jikan** | `GET /api/jikan/proxy?path=...` | Direct REST proxy for Jikan v4 API. |
| **2** | **Mapping** | `GET /api/malsync/<mal_id>` | MAL to AniList/Streaming mapping. |


#### 💬 Community & Comments
| Action | Endpoint | Purpose |
| :--- | :--- | :--- |
| **Get** | `GET /api/comments?animeId=...` | Retrieve episode discussion threads. |
| **Post** | `POST /api/comments` | Post a new community comment. |
| **Vote** | `POST /api/comments/vote` | Upvote or Downvote a comment. |

### 🟢 Node.js User API (`/api/user.js`)
| Action | Endpoint | Purpose |
| :--- | :--- | :--- |
| **Register** | `POST /api/auth/register` | Secure user registration. |
| **Login** | `POST /api/auth/login` | JWT-based user authentication. |
| **List** | `GET /api/user/watchlist` | Manage personal anime collections. |

---

## 📂 Database Schema (MongoDB)

Our data model is designed for high-concurrency and fast lookups:

- **Users:** Stores hashed passwords, profile settings, and account metadata.
- **Watchlist:** Tracks anime status (`Watching`, `Planned`, `Dropped`) and current progress.
- **Comments:** A nested system for episode-specific discussions and community engagement.

---

## 🛠️ Detailed Setup Guide

### 1. Prerequisite Environment
Ensure you have the following installed:
- **Node.js 20+**
- **Python 3.10+**
- **MongoDB Atlas Account**

### 2. Configuration
Copy the template and fill in your secrets:
```bash
cp .env.example .env
```
Key variables to set:
- `MONGO_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A long random string for auth security.
- `EMAIL_USER`: Your Gmail address (e.g., `user@gmail.com`).
- `EMAIL_PASS`: Your 16-digit Gmail App Password.
- `FRONTEND_URL`: Your frontend domain (e.g., `http://localhost:5173` or `https://anixo.online`).

### 3. Frontend Installation (Root Directory)
```bash
# Run this in the project root to install frontend dependencies
npm install
npm run dev
```

### 4. Backend Proxy & Scraper (Python)
```bash
# Install Python dependencies and start the scraper
pip install -r requirements.txt
python api/index.py
```

### 5. Authentication Server (API Directory)
```bash
# IMPORTANT: You MUST also install dependencies in the api folder
cd api
npm install
npm run dev  # Starts the auth gateway on port 5001
```

---

## 🛡️ Security & Performance
To ensure a premium and safe experience, AniXo implements:
- **Rate Limiting:** Prevents API abuse and brute-force attacks via `express-rate-limit`.
- **Security Headers:** Uses `helmet` to protect against common web vulnerabilities.
- **JWT Authentication:** Secure stateless session management for user data.
- **HLS Optimization:** Adaptive bitrate streaming for smooth playback on any network.
- **Scraper Caching:** Reduces external API calls by caching stream results in `stream_cache.json`.

---

## 📜 Development Scripts
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server for the frontend. |
| `npm run build` | Compiles the frontend for production deployment. |
| `npm run lint` | Runs ESLint to check for code quality and style issues. |
| `npm run preview` | Previews the production build locally. |

---

## 🗺️ Future Roadmap
- [ ] **Sync with MAL/AniList:** Bi-directional sync for watchlist data.
- [ ] **PWA Support:** Install AniXo as a native app on mobile and desktop.
- [ ] **Advanced Player Skins:** Customizable themes for the streaming player.
- [ ] **Community Forums:** Dedicated space for anime discussions.
- [ ] **Recommendation AI:** Personalized suggestions based on watch history.
- [ ] **Social Features:** Friend lists and activity feeds.

---

## 💡 Pro Tips for Developers
- **Environment Security:** Never commit your `.env` file to a public repository. Use the included `.env.example` as a template for other contributors.
- **Scraper Health:** If you notice slow loading times, check the `stream_cache.json` file. It helps reduce redundant API calls but can be cleared if data becomes stale.
- **Rate Limit Management:** When using the Jikan fallback, avoid making more than 3 requests per second to stay within their free-tier limits.
- **HLS Stability:** For the best streaming performance, ensure your server supports `CORS` and use `hls.js` compatible browsers (Chrome, Edge, Safari).
- **Vercel Deployment:** If deploying to Vercel, make sure to configure the `vercel.json` properly to handle both Python and Node.js runtimes.

---

## 🔧 Troubleshooting
| Issue | Solution |
| :--- | :--- |
| **"Anime Not Found"** | Check if your Python proxy is running on port 5000. |
| **Login Fails** | Ensure your `MONGO_URI` is correct and IP access is enabled in Atlas. |
| **Video Not Playing** | Try switching servers (S1/S2) or check your internet connection. |
| **Rate Limits** | If Jikan fallback triggers too often, you may hit Jikan's 429 limit. |

---

## ⚖️ Legal & DMCA
AniXo is a metadata aggregator and does not host any video files on its servers. All content is pulled from publicly available third-party providers. For removal requests, please refer to the DMCA page. This project is for educational purposes only.

---

## 📜 License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE.md) file for more details.

---

## 👥 Contribution
We welcome contributions! Please fork the repo, create a feature branch, and submit a PR. For major changes, please open an issue first.

---

<p align="center">
  Developed with ❤️ for the Anime Community.<br>
  <i>For educational purposes only. Built by the AniXo Team.</i>
</p>
