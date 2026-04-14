FROM node:20-alpine AS builder

WORKDIR /app

# Copy API package metadata and Prisma schema
COPY api/package.json ./api/
COPY prisma/ ./prisma/

# Install dependencies and generate Prisma client
RUN cd api && npm install \
    && npm install prisma@6.5.0 --save-dev \
    && npx prisma generate --schema=../prisma/schema.prisma

# Copy API source
COPY api/ ./api/

# Build
RUN cd api && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/api/package.json ./
COPY --from=builder /app/api/node_modules ./node_modules
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]
