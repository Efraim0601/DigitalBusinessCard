# syntax=docker/dockerfile:1.7
# Use the official Node.js image as the base image
FROM node:22-alpine AS builder

# Build deps for native modules (sharp/ipx)
RUN apk add --no-cache python3 make g++

# Set the working directory inside the container
WORKDIR /app

# Copy lockfile and manifest explicitly
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy only required source files
COPY app ./app
COPY public ./public
COPY server ./server
COPY scripts ./scripts
COPY types ./types
COPY nuxt.config.ts ./nuxt.config.ts
COPY tsconfig.json ./tsconfig.json

# Build the Nuxt application
RUN npm run build

# Install server runtime deps (ipx, etc.) so COPY includes them
RUN cd .output/server && npm ci --omit=dev

# Final stage
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S appgroup \
  && adduser -S -G appgroup appuser
COPY --from=builder --chmod=0555 /app/.output /app/.output

# Expose the port Nuxt runs on (default is 3000)
EXPOSE 3000

# Start the Nuxt server
USER appuser
CMD ["node", "/app/.output/server/index.mjs"]