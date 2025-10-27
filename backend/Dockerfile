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

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm install prisma --save-dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY src/prisma ./src/prisma
COPY entrypoint.sh ./entrypoint.sh
COPY healthcheck.sh ./healthcheck.sh

RUN chmod +x ./entrypoint.sh ./healthcheck.sh

RUN groupadd --system app && useradd --system --gid app app

RUN chown -R app:app /app

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD ./healthcheck.sh

ENTRYPOINT ["./entrypoint.sh"]


