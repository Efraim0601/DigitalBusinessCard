FROM node:20-alpine AS build

WORKDIR /app

ENV NUXT_DISABLE_FONTS=1

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup \
  && adduser -S -u 1001 -G appgroup appuser

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json

# Copie en root puis droits lecture seule : évite les hotspots « write sur ressources copiées »
RUN chown -R appuser:appgroup /app \
  && find /app/.output -type d -exec chmod 555 {} \; \
  && find /app/.output -type f -exec chmod 444 {} \; \
  && chmod 444 /app/package.json

USER appuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
