# ============================================================================
# STAGE 1: Dependencies
# ============================================================================
FROM node:20-alpine AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files and schema for client generation
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Install ALL dependencies (including dev) for build stage
# Use --ignore-scripts to skip husky install
RUN npm install --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# ============================================================================
# STAGE 2: Build
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code and fresh prisma folder
COPY . .

# Build application
RUN npm run build

# Install only production dependencies (and rebuild bcrypt)
# ts-node/typescript se mantienen para poder sembrar en boot con RUN_SEED_ON_BOOT=1
RUN apk add --no-cache python3 make g++ && \
    npm install --only=production --ignore-scripts && \
    npm install ts-node typescript --no-save --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# ============================================================================
# STAGE 3: Production
# ============================================================================
FROM node:20-alpine AS production

# Install dumb-init and openssl for proper signal handling and Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy necessary files from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Copy templates for docx generation (commented - folder doesn't exist yet)
# COPY --from=build --chown=nestjs:nodejs /app/templates ./templates

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
# Si RUN_SEED_ON_BOOT=1 (solo al recrear la DB Free), siembra datos demo + normativas/clausulas.
# Luego quita o pon RUN_SEED_ON_BOOT=0 para que los deploys normales no borren datos.
# compiler-options evita TS5109 (module NodeNext vs moduleResolution) al correr prisma/seed.ts
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED_ON_BOOT\" = \"1\" ]; then echo 'RUN_SEED_ON_BOOT=1 — ejecutando seed...'; SEED_FORCE=1 npx ts-node --transpile-only --compiler-options '{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}' prisma/seed.ts; fi && node dist/main"]
