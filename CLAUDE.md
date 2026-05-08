# Podomoro — Full-Stack Restaurant Management Platform

## Project Overview
Multi-branch Dutch restaurant management system. 11 integrated modules, one PostgreSQL database, one auth layer. See `podomoro-prompt.md` for full spec.

## Tech Stack
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Frontend: React + TypeScript + Vite
- Auth: JWT + RBAC
- Real-time: Socket.IO
- Email: Nodemailer + node-cron
- Payments: Stripe
- PDF: Puppeteer

## Key Rules
- All monetary values stored as integers (eurocents)
- All dates stored UTC, displayed in Europe/Amsterdam
- Waste log and allergen_log are append-only — no DELETE/UPDATE routes
- Allergen popup is legally required (NVWA) — must not be skippable
- Finance routes: 403 for all roles except owner and boekhouder
- Dashboard routes: 403 for all roles except owner and partner
- All UI labels in Dutch; all code/comments/variables in English
- bcrypt cost factor 12

## Build Order
See plan file: `~/.claude/plans/warm-imagining-whistle.md`
Phase 1: Scaffolding → Schema → Branches → Auth → Menu

## Workflow
- Use plan mode before each Phase
- Run verification after each Step
- `npm run lint && npm run typecheck` after each module
- Never commit .env
- Commit every Prisma migration — never squash
