# 1. Base image resmi Bun dengan Alpine Linux (sangat ringan ~90MB)
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 2. Tahap Dependencies (Cache optimization)
# Hanya salin package.json & lockfile terlebih dahulu agar Docker cache efisien
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# 3. Salin seluruh source code & aset statis
COPY src ./src
COPY public ./public
COPY tsconfig.json ./

# Buat direktori data untuk SQLite dan berikan hak akses
RUN mkdir -p /app/data && chown -R bun:bun /app

# Gunakan non-root user bawaan bun untuk keamanan
USER bun

# Environment variable
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/todos.db

# Expose port aplikasi
EXPOSE 3000

# Health check container bawaan Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Jalankan aplikasi dengan runtime Bun
CMD ["bun", "run", "src/index.ts"]
