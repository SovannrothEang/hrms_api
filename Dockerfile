# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 build-base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Ensure pnpm store is isolated inside the container
RUN pnpm config set store-dir /pnpm/store

COPY package.json pnpm-lock.yaml ./

# --- Development Stage ---
FROM base AS development
# Install ALL dependencies (including dev)
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY . .
EXPOSE 3001
CMD ["pnpm", "start:dev"]

# --- Builder Stage (for Production) ---
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN pnpm exec prisma generate
COPY . .
RUN pnpm run build

# --- Runner Stage (Production) ---
# Derive from base to keep pnpm and path settings
FROM base AS runner
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Copy built assets and the generated prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]