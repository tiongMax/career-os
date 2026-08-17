FROM node:22-alpine3.22 AS builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build

FROM node:22-alpine3.22

ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist
COPY backend/migrations ./migrations

USER node

EXPOSE 8080

CMD ["node", "dist/server.js"]
