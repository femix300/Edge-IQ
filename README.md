# EdgeIQ

[![Python](https://img.shields.io/badge/Python-3.10-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-green)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-orange)](https://firebase.google.com/)

EdgeIQ is an AI-powered quantitative intelligence platform built for prediction market traders. It aggregates live market data, runs expected-value (EV) and calibration models, generates AI-driven trading signals via Gemini, and provides portfolio tracking and backtesting tools — all in one unified interface.

## 🚀 Live Demo & API URLs

The application is deployed and live at the following URLs:

- **Frontend Application**: [https://edge-iq-psi.vercel.app](https://edge-iq-psi.vercel.app)
- **Backend API**: [https://edge-iq.onrender.com](https://edge-iq.onrender.com)

## 📚 API Documentation

The backend is fully self-documented using `drf-spectacular`. You can explore and test endpoints directly via the browser:

- **Swagger UI** (Interactive testing): [https://edge-iq.onrender.com/api/docs/swagger/](https://edge-iq.onrender.com/api/docs/swagger/)
- **ReDoc** (Full reference): [https://edge-iq.onrender.com/api/docs/redoc/](https://edge-iq.onrender.com/api/docs/redoc/)
- **OpenAPI Schema**: [https://edge-iq.onrender.com/api/schema/](https://edge-iq.onrender.com/api/schema/)

## 🛠 Tech Stack

EdgeIQ is a full-stack application leveraging modern, scalable technologies:

### Frontend (`app/`)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Data Visualization**: Recharts
- **Hosting**: Vercel

### Backend (`backend/`)
- **Framework**: Django 5.2 + Django REST Framework
- **Language**: Python 3.10
- **AI Integration**: Gemini AI (`google-genai`) for intelligent market analysis and concurrent quota failover.
- **Task Queue**: Celery + Redis for asynchronous market scanning and periodic AI signal generation.
- **External Data**: Bayse Markets API (`relay.bayse.markets`) for real-time order books and resolution data.
- **Hosting**: Render

### Shared Infrastructure
- **Authentication**: Firebase Auth. The frontend handles OAuth/email flows, and the backend verifies JWT tokens securely using the Firebase Admin SDK.
- **Database**: Firestore (NoSQL). A serverless persistence layer tailored for rapid document reads/writes, bypassing complex query limitations through clever backend memory sorting.

## ⚙️ Getting Started (Local Development)

To run EdgeIQ locally, you need to spin up both the backend API and the frontend React application.

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
BAYSE_API_BASE_URL=https://relay.bayse.markets
BAYSE_PUBLIC_KEY=your-bayse-public-key
BAYSE_SECRET_KEY=your-bayse-secret-key
GEMINI_API_KEY=your-gemini-api-key
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS_PATH=/path/to/your/service-account.json
```
*(You will need to generate a Firebase Admin service account JSON from your Firebase Console).*

Run the backend server:
```bash
python manage.py runserver
```

*(Optional)* Run Celery workers for async background tasks:
```bash
celery -A config worker --loglevel=info
```

### 2. Frontend Setup

```bash
cd app
npm install
```

Create a `.env` file in the `app/` directory:
```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:8000/api
```

Run the frontend development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## 🧠 What Problem It Solves

Prediction markets are noisy. Prices move fast, EV is hard to compute in real time, and most traders lack systematic tools to track edge, calibrate beliefs, and size positions. EdgeIQ cuts through the noise by scanning markets, running quant models on the backend, surfacing high-confidence signals generated with Gemini AI, and letting traders backtest strategies before they deploy capital.

## 🎯 Who It's For

- Prediction market traders who want data-driven signals, not gut feel.
- Quant-oriented bettors who care about calibration, EV, and position sizing.
- Teams building systematic strategies over event-derivative markets.

## 🗂 Repository Layout

- [`app/`](./app/README.md) — React frontend source, build config, and deployment scripts.
- [`backend/`](./backend/README.md) — Django backend, API routes, models, quant logic, and Celery tasks.
- [`HANDOFF.md`](./HANDOFF.md) — Detailed technical notes on recent Gemini failover and caching architectural updates.
