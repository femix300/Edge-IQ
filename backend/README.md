# EdgeIQ Backend

Django backend for the EdgeIQ quantitative finance platform.

## Setup

1. Create virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` file from template:

```bash
cp .env.example .env
```

4. Update `.env` with your API keys

5. Run migrations:

```bash
python manage.py migrate
```

6. Create superuser:

```bash
python manage.py createsuperuser
```

7. Run server:

```bash
python manage.py runserver
```

## Project Structure

- `markets/` - Market data and scanning
- `signals/` - Signal generation and storage
- `portfolio/` - User portfolio tracking
- `backtesting/` - Strategy backtesting
- `agents/` - Four AI agents (scanner, quant, AI prob, signal)
- `services/` - External API clients (Bayse, Gemini)
- `utils/` - Helper functions and calculations

## API Endpoints

- `GET /api/markets/` - List all active markets
- `GET /api/signals/` - List all active signals
- More to be documented...
