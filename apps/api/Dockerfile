# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
COPY prisma/schema.prisma ./prisma/

# Install dependencies (including Prisma CLI)
RUN npm install

# Generate Prisma client (downloads binary for current platform)
RUN npx prisma generate

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PRISMA_DISABLE_POSTINSTALL_BITTE=true

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install production deps
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
RUN npm install --omit=dev

# Copy Prisma client (already generated with binary)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy source and schema
COPY --from=builder /app/apps/api/src ./src
COPY --from=builder /app/prisma ./prisma

# Create storage directories
RUN mkdir -p /app/storage/resources /app/storage/tickets /app/storage/forms /app/storage/curricula /app/storage/logos /app/storage/exports

EXPOSE 3001

CMD ["node", "src/server.js"]
