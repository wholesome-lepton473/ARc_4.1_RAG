# Frontend for Arc 4.1

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   copy .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

- `VITE_API_URL`: Backend API URL (default: `http://localhost:8000`)
