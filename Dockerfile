FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Nettoyer les caches de build avant de compiler
RUN rm -rf dist/ *.tsbuildinfo
RUN npm run build
RUN ls -la dist/main.js && echo "BUILD OK" || (echo "BUILD FAILED: no dist/main.js" && exit 1)

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
EXPOSE 3002
CMD ["node", "dist/main"]
