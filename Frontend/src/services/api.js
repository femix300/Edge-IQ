/**
 * EdgeIQ API Service
 * Centralized API client for all backend communication
 * Uses token authentication for protected endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Headers helper
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('edgeiq_token');
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
  }

  return headers;
};


const checkResponse = async (response) => {
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw { status: response.status, data: errData, message: errData.detail || errData.error || errData.message || 'API Error' };
  }
  if (response.status === 204) {
    return { success: true };
  }
  return response.json();
};

// Error handler
const handleError = (error) => {
  console.error('API Error:', error);
  const status = error?.status || error?.response?.status;
  if (status === 401) {
    localStorage.removeItem('edgeiq_token');
    localStorage.removeItem('edgeiq_user');
    window.location.href = '/auth';
  }
  throw error;
};

// ========== AUTH ENDPOINTS ==========
export const authAPI = {
  /**
   * Register new user
   * POST /api/users/register/
   */
  register: async (email, password, username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register/`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ username, email, password, password_confirm: password }),
      });
      const data = await checkResponse(response);
      if (data.token) {
        localStorage.setItem('edgeiq_token', data.token);
        localStorage.setItem('edgeiq_user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Login user
   * POST /api/users/login/
   */
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login/`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ username, password }),
      });
      const data = await checkResponse(response);
      if (data.token) {
        localStorage.setItem('edgeiq_token', data.token);
        localStorage.setItem('edgeiq_user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Logout user
   * POST /api/users/logout/
   */
  logout: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/logout/`, {
        method: 'POST',
        headers: getHeaders(true),
      });
      localStorage.removeItem('edgeiq_token');
      localStorage.removeItem('edgeiq_user');
      return await checkResponse(response);
    } catch (error) {
      localStorage.removeItem('edgeiq_token');
      localStorage.removeItem('edgeiq_user');
      return handleError(error);
    }
  },

  /**
   * Get current user profile
   * GET /api/users/profile/
   */
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Update user profile
   * PATCH /api/users/update_profile/
   */
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/update_profile/`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify(profileData),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
};

// ========== MARKET ENDPOINTS ==========
export const marketsAPI = {
  /**
   * Get all markets
   * GET /api/markets/?status=open&min_volume=1000
   */
  getMarkets: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${API_BASE_URL}/api/markets/?${query}` : `${API_BASE_URL}/api/markets/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get market detail
   * GET /api/markets/{id}/
   */
  getMarket: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${id}/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Scan markets
   * POST /api/markets/scan/
   */
  scanMarkets: async (params = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/scan/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(params),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Analyze market (run full 4-agent pipeline)
   * POST /api/markets/{id}/analyze/
   */
  analyzeMarket: async (id, bankroll = 10000) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${id}/analyze/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ user_bankroll: bankroll }),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Start async analysis job
   * POST /api/markets/{id}/analyze_async/
   */
  analyzeMarketAsync: async (id, bankroll = 10000) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${id}/analyze_async/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ user_bankroll: bankroll }),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Check async task status
   * GET /api/markets/task_status/?task_id=...
   */
  getTaskStatus: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/task_status/?task_id=${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
};

// ========== SIGNAL ENDPOINTS ==========
export const signalsAPI = {
  /**
   * Get all signals
   * GET /api/signals/?is_active=true&min_edge=15
   */
  getSignals: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${API_BASE_URL}/api/signals/?${query}` : `${API_BASE_URL}/api/signals/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get signal detail
   * GET /api/signals/{id}/
   */
  getSignal: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signals/${id}/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get active signals
   * GET /api/signals/active/?limit=10&min_edge=20
   */
  getActiveSignals: async (limit = 20, minEdge = 15) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/signals/active/?limit=${limit}&min_edge=${minEdge}`,
        {
          method: 'GET',
          headers: getHeaders(true),
        }
      );
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get signal statistics
   * GET /api/signals/stats/
   */
  getCalibration: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signals/calibration-curve/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signals/stats/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
};

// ========== PORTFOLIO ENDPOINTS ==========
export const portfolioAPI = {
  /**
   * Get user portfolio profile
   * GET /api/portfolio/profile/
   */
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/profile/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Update portfolio profile
   * POST /api/portfolio/update_profile/
   */
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/update_profile/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(profileData),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get trades
   * GET /api/portfolio/trades/?status=won
   */
  getTrades: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${API_BASE_URL}/api/portfolio/trades/?${query}` : `${API_BASE_URL}/api/portfolio/trades/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Create trade
   * POST /api/portfolio/trades/
   */
  createTrade: async (tradeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/trades/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(tradeData),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get portfolio analytics
   * GET /api/portfolio/analytics/
   */
  simulateTrade: async (tradeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/simulate_trade/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(tradeData),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  closeTrade: async (tradeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/close_trade/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(tradeData),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  getAnalytics: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/analytics/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
};

// ========== BACKTEST ENDPOINTS ==========
export const backtestAPI = {
  /**
   * Get backtest strategies
   * GET /api/backtest/strategies/
   */
  getStrategies: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/backtest/strategies/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Get backtest results
   * GET /api/backtest/results/
   */
  getResults: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/backtest/results/`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Run backtest
   * POST /api/backtest/run/
   */
  runBacktest: async (strategyConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/backtest/run/`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ strategy_config: strategyConfig }),
      });
      return await checkResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default {
  authAPI,
  marketsAPI,
  signalsAPI,
  portfolioAPI,
  backtestAPI,
};
