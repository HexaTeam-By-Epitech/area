FROM node:20-bullseye-slim AS builder

WORKDIR /app

ENV npm_config_loglevel=error

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npx prisma generate --schema=src/prisma/schema.prisma
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN groupadd --system app && useradd --system --gid app app

USER app

EXPOSE 3000

CMD ["node", "dist/main.js"]