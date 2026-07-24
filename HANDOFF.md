# Edge-IQ Backend Handoff

This document tracks the recent architectural changes and fixes implemented in the Edge-IQ backend to handle Gemini AI quotas, caching, and model failovers.

## 1. Background & Parallel Quota Checking
- We noticed the frontend was experiencing significant latency when users clicked "Deep Dive" because the backend was synchronously checking the API quotas for all Gemini models before running the analysis.
- **Fix**: We refactored `services/gemini_client.py` to use `ThreadPoolExecutor` to check model quotas concurrently in parallel. This slashed the checking latency down to ~500ms.
- **Background Endpoint**: Created a new endpoint `GET /api/markets/check_quotas/` and an asynchronous celery task (`async_check_quotas`). We integrated this into the React frontend (`App.tsx`), so that quotas are checked and warmed up *quietly in the background* the moment a user logs in. By the time they click "Deep Dive", the absolute best model is already loaded in memory.

## 2. Gemini Model Failover & 404 Deprecations
- **Error**: Users were getting `429 RESOURCE_EXHAUSTED` or `404 NOT_FOUND` errors when certain experimental models were deprecated or rate-limited by Google.
- **Fix**: Implemented a failover mechanism in `check_model_quotas`. It separates working models from exhausted models, prioritizing the highest tier available model.
- **Deprecated Models Commented Out**: Google recently deprecated the experimental `gemini-2.5-*` models (they permanently returned 404). We commented out `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-2.5-flash-lite` from the `AVAILABLE_MODELS` list in `gemini_client.py`. The system now correctly relies on the proven `2.0` series and the experimental `3.x` previews.

## 3. Stabilizing AI Analysis & Conditional Caching
- **Problem**: Because of the model failovers (and temperature > 0), running a "Deep Dive" multiple times within a few minutes caused the AI to output fluctuating probabilities. This created a jarring UX ("bouncing numbers").
- **Fix (Option B)**: We implemented a 4-hour caching window for AI analysis results in `agents/ai_probability.py`. 
- **Refinement (Edge-based Caching)**: We refined the caching logic so that it **only** caches if the resulting Edge is >= 5. 
  - When a Deep Dive is requested, the system reads the live Quant `implied_probability`.
  - It pulls the latest AI analysis from Firestore (if less than 4 hours old) and calculates `edge = abs(cached_probability - current_implied_probability)`.
  - If `edge >= 5`, it reuses the cached AI reasoning/probability and applies a simulated `time.sleep(5)` delay for realistic UX.
  - If `edge < 5`, it discards the cache and calls Gemini for a fresh perspective, hoping to uncover a new trading edge based on breaking news.

## Current State
The backend is now highly resilient to API rate limits, minimizes unnecessary Gemini API calls (saving massive amounts of quota), and provides a stable UX for high-conviction trades while actively re-evaluating low-conviction predictions.
