FROM node:20-bullseye-slim AS builder

WORKDIR /app

ENV npm_config_loglevel=error

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

FROM nginx:stable-alpine AS runner

ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=builder /app/dist ./

RUN mkdir -p /usr/share/nginx/html/apk

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8081

CMD sh -c "nginx -g 'daemon off;' & NGINX_PID=$! && \
  (if [ -f /shared/client.apk ]; then cp /shared/client.apk /usr/share/nginx/html/client.apk; fi) && \
  wait $NGINX_PID"

