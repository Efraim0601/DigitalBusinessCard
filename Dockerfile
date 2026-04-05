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

# Nitro embarque `node_modules` tracés (ex. xlsx, jszip, pg) sous `.output/server/`.
COPY --from=build /app/.output ./.output
RUN chown -R appuser:appgroup /app/.output

USER appuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
