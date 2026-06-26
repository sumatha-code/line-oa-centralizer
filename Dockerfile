# --- Base Node ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./

# --- Dependencies ---
FROM base AS deps
RUN npm ci

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# --- Runner (Next.js Web App) ---
FROM base AS runner
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

# --- Worker (Queue Consumer) ---
FROM base AS worker
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# We can use ts-node in production or build a standalone js for worker.
# Since it runs in docker alpine, we can compile worker or just use ts-node.
# Let's run with ts-node for TypeScript execution inside worker container.
CMD ["npx", "ts-node", "src/worker/index.ts"]
