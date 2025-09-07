FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Prefer IPv4 DNS resolution in runtime to avoid ENETUNREACH on some hosts
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/app.js"]
