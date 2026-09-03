FROM node:22-bookworm AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time defaults only; production values are injected by Compose at runtime.
ENV NODE_ENV=production \
  ENVIRONMENT_NAME=baby-docker-build \
  DATABASE_URL=postgresql://babyly:build-only@localhost:5432/babyly_build \
  APP_BASE_URL=https://baby.example.invalid \
  ACCESS_CODE=build-only-access-code \
  SESSION_SECRET=build-only-session-secret-with-at-least-32-characters \
  EMAIL_DELIVERY_MODE=console \
  PRIVACY_CONTACT_EMAIL=privacy@example.invalid \
  PREDICTION_DEADLINE_DATE=2026-12-20T23:59:59Z

RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
