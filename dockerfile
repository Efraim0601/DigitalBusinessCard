# Use the official Node.js image as the base image
FROM node:22-alpine AS builder

# Build deps for native modules (sharp/ipx)
RUN apk add --no-cache python3 make g++

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Nuxt application
RUN npm run build

# Install server runtime deps (ipx, etc.) so COPY includes them
RUN cd .output/server && npm install --omit=dev

# Final stage
FROM node:22-alpine AS runner

WORKDIR /app
COPY --from=builder /app/.output /app/.output

# Expose the port Nuxt runs on (default is 3000)
EXPOSE 3000

# Start the Nuxt server
CMD ["node", "/app/.output/server/index.mjs"]