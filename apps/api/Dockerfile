# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-alpine AS deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ============================================
# Stage 2: Builder
# ============================================
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY . .

# Build packages in order
RUN pnpm --filter @life-assistant/shared build
RUN pnpm --filter @life-assistant/config build
RUN pnpm --filter @life-assistant/database build
RUN pnpm --filter @life-assistant/api build

# ============================================
# Stage 3: Production
# ============================================
FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10 --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy built assets and production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy workspace packages (built)
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./node_modules/@life-assistant/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./node_modules/@life-assistant/shared/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./node_modules/@life-assistant/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/package.json ./node_modules/@life-assistant/config/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./node_modules/@life-assistant/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./node_modules/@life-assistant/database/package.json

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
