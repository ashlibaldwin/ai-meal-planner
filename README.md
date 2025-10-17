# 🍽️ AI Meal Planner

An end-to-end AI app that turns a chat into a personalized weekly meal plan backed by a database, deterministic LLM tests, and automated quality gates. Built to showcase full‑stack product thinking.

## ✨ What it does

- 🤖 **Chat-to-Plan**: Describe goals, time, difficulty, and diets; get a weekly plan.
- ➕ **Add/Modify**: Ask for changes (e.g., “add 2 fish meals”) without losing context.
- 🛒 **Grocery List**: Auto-aggregated ingredients with smart de-duplication.
- 📱 **Responsive UI**: Mobile-friendly experience.

## 🔧 Production-grade highlights

- **Deterministic LLM tests**: Record/replay fixtures (`src/lib/__tests__/recording-openai.ts`), CI runs basic tests only (fixtures do not replay in CI).
- **Commit-time quality**: Husky + lint-staged (ESLint/Prettier) and optional fixture recording.
- **Service/API boundaries**: `api/chat` orchestrates intents; `meal-plan-service` owns domain logic; `openai` centralizes prompting and fallbacks.
- **Data integrity**: Prisma schema/migrations with recipe name uniqueness; seeding via `prisma/seed.ts`.
- **Safe config**: `src/lib/config.ts` validates required env in production.

## 🧱 Architecture

- `src/routes/api/chat/+server.ts`: chat → plan (create, add, modify)
- `src/lib/meal-plan-service.ts`: Prisma-backed plan ops + grocery building
- `src/lib/openai.ts`: parsing, scoring, ranking, and fallbacks
- `src/lib/message-parser.ts`: intent and count extraction without LLM

## ⚡ Quickstart

1. Install
   ```bash
   npm install
   ```
2. Env
   ```env
   OPENAI_API_KEY=your_key_here            # optional for dev
   DATABASE_URL="postgresql://user:pass@localhost:5432/meal_planner"
   ```
3. DB
   ```bash
   npm run db:generate && npm run db:push && npm run db:seed
   ```
4. Run
   ```bash
   npm run dev
   ```

## 🚦 CI

GitHub Actions installs, generates Prisma client, lints/format-checks, and runs tests with LLM replay on every push/PR.

## 🚀 Deployment

Cloud-ready for Vercel (`svelte.config.js` uses the Vercel adapter). Provision Postgres (e.g., Neon), set `DATABASE_URL` and `OPENAI_API_KEY`, and run migrations/seed via your provider’s workflow.

## 🔌 API

- `POST /api/chat` — create/add/modify plan from message + preferences
- `GET /api/recipes` — fetch available recipes

## 🔮 Future upgrades

- **Migrate to Vercel AI SDK** for streaming responses, provider abstraction, and structured outputs; simplify `openai` usage and improve token-by-token UX.

- **More recipes, still fast**: add simple search and filters, paginate results, and cache generated plans so common requests return quickly.
- **Sign‑in and saved plans**: log in, come back to your plan, and add/manage your own recipes.
- **Recipe management**: create, edit, and delete custom recipes; import recipes from popular cooking websites; share recipes with friends and family.
- **Grocery handoff**: optionally send the shopping list to a retailer API (e.g., Instacart/Walmart) when ready.

## License

MIT License - see LICENSE file for details
