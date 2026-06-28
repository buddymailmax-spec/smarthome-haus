# --- Stage 1: build the frontend ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: runtime (Express serves API + built frontend) ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only the server's production dependencies.
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# App code + built frontend.
COPY server ./server
COPY --from=build /app/dist ./dist

# OAuth tokens persist here — mount a volume on this path in Coolify.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
