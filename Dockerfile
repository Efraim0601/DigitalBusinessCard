# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS build

WORKDIR /app

ENV NUXT_DISABLE_FONTS=1

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY public ./public
COPY server ./server
COPY scripts ./scripts
COPY types ./types
COPY nuxt.config.ts ./nuxt.config.ts
COPY tsconfig.json ./tsconfig.json

RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup \
  && adduser -S -u 1001 -G appgroup appuser

COPY --from=build --chmod=0555 /app/.output ./.output

USER appuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
