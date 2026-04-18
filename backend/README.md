# EdgeIQ Backend

Django backend for EdgeIQ - prediction market trading signals with AI agents.

## Quick Start

### 1. Setup Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
BAYSE_API_KEY=your_bayse_key_here
GEMINI_API_KEY=your_gemini_key_here
SECRET_KEY=your_django_secret_key
DEBUG=True
```

### 4. Database Setup

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 5. Run Server

```bash
python manage.py runserver
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/markets/scan/` | Fetch markets from Bayse |
| POST | `/api/markets/{id}/analyze/` | Run all 4 agents on a market |
| GET | `/api/markets/` | List all markets |
| GET | `/api/signals/active/` | Get active trading signals |
| GET | `/api/portfolio/profile/` | Get user profile |
| POST | `/api/portfolio/simulate_trade/` | Record a trade |
| GET | `/api/portfolio/analytics/` | Get performance metrics |

## Project Structure

```
backend/
├── agents/              # 4 AI agents
│   ├── market_scanner.py    # Fetches markets
│   ├── quant_analyzer.py    # Momentum & volume
│   ├── ai_probability.py    # Gemini AI estimates
│   └── signal_generator.py  # Generates signals
├── markets/             # Market data
├── signals/             # Trading signals
├── portfolio/           # User trades
├── backtesting/         # Strategy testing
├── services/            # API clients (Bayse, Gemini)
└── utils/               # Calculations (Kelly, EV, Sharpe)
```

## Testing

```bash
# Test full AI pipeline
python test_bayse.py

# Test API endpoints (server must be running)
python test_api.py
```

## Configuration

### Risk Tolerance Levels

- `conservative` - 25% of Kelly
- `balanced` - 50% of Kelly  
- `aggressive` - 100% of Kelly

### Minimum Edge Threshold

Signals require edge ≥ 15% by default (adjust in `signal_generator.py`)

## Admin Panel

Visit `http://127.0.0.1:8000/admin/` to view:

- Markets and price history
- Generated signals
- AI analyses
- User trades

## Common Commands

```bash
# Run specific agent individually
python manage.py shell
>>> from agents.market_scanner import scan_markets
>>> scan_markets()

# Deactivate expired signals
python manage.py shell
>>> from agents.signal_generator import deactivate_expired_signals
>>> deactivate_expired_signals()
```

## Requirements

- Python 3.9+
- Django 4.2
- Bayse API key
- Google Gemini API key