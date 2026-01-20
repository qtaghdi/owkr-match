# CLAUDE.md - OWKR Match

## Project Overview

OWKR Match is a web-based Overwatch 2 team balancing tool for managing competitive scrimmages. It parses player data, runs an optimization algorithm to balance teams by rank, and supports manual adjustments. The UI is in Korean.

## Tech Stack

- **Frontend:** React 19, TypeScript 5.9, Vite (Rolldown), Tailwind CSS 3.4
- **Backend:** Vercel serverless functions (Node.js)
- **Auth:** Discord OAuth2 + JWT (7-day tokens, httpOnly cookies)
- **Animation:** Framer Motion
- **Build:** Vite, ESLint 9, PostCSS

## Project Structure

```
src/
├── components/          # React components by feature
│   ├── auth/           # Discord login UI
│   ├── player/form/    # Player input + bulk paste
│   ├── player/list/    # Player list display
│   ├── match/result/   # Team cards + swap UI
│   └── roles/icon/     # Role icons
├── hooks/
│   ├── use-auth.ts     # Discord auth state
│   └── use-balance.ts  # Core balancing algorithm
├── types/              # TypeScript interfaces
├── constants/          # Tier definitions, scoring
└── utils/parser/       # Discord chat log parsing

api/auth/               # Vercel serverless routes
├── login.ts            # Discord OAuth redirect
├── callback.ts         # OAuth callback, JWT issuance
└── me.ts               # JWT verification
```

## Commands

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build to dist/
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Key Concepts

### Scoring Formula
```typescript
score = (tierIndex * 600) + ((6 - division) * 100)
// Tiers: BRONZE(0) → CHAMPION(7), Divisions: 1-5
```

### Role System
- Roles: `TANK`, `DPS`, `SUPPORT`
- Use `!` suffix for preferred role (e.g., `다이아3!`)
- Algorithm adds +100M bonus for preferred role assignment

### Player Input Formats
```
PlayerName#1234 탱커 다이아3 딜러 플레4 힐러 마스터5
PlayerName#1234 다3 플2 골1          # Abbreviations
PlayerName#1234 다3! 플2 골1         # ! = preferred
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DISCORD_CLIENT_ID` | OAuth2 app ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 secret |
| `ADMIN_USER_IDS` | Comma-separated allowed Discord user IDs |
| `JWT_SECRET` | JWT signing secret |

## Patterns & Conventions

- **Components:** Functional + hooks only, no class components
- **State:** useState/useEffect, localStorage persistence, no Redux
- **Naming:** PascalCase components, camelCase functions, UPPER_SNAKE constants
- **Styling:** Tailwind dark theme (`#0b0c10` bg), blue/cyan gradients for CTAs
- **TypeScript:** Strict mode, explicit types, interfaces for data models
- **JSDoc:** Flow-focused, concise, and every JSDoc block must include an `@description` tag; avoid exhaustive narration
- **CSS:** Keep style files free of comments

## Important Files

- `src/hooks/use-balance.ts` - Core balancing algorithm (most complex logic)
- `src/utils/parser/index.ts` - Player input parsing
- `src/App.tsx` - Main component orchestrating state
- `src/constants/index.ts` - Tier definitions, scoring formula

## Notes

- No test suite configured
- Korean UI throughout
- Deployed on Vercel (frontend + serverless API)
- localStorage keys: `owkr_players`, `owkr_result`
