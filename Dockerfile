FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
