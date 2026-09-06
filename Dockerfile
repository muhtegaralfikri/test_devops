# ==============================================================================
# TAHAP 1: BUILDER (Kompilasi ke Single Standalone Binary)
# ==============================================================================
FROM oven/bun:1-alpine AS builder
WORKDIR /build

# Salin manifest dependensi
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Salin source code backend & konfigurasi
COPY src ./src
COPY tsconfig.json ./

# COMPILE DEWA: Gabungkan seluruh TypeScript + Express + Bun ke 1 File Binary!
RUN bun build --compile --minify src/index.ts --outfile server

# ==============================================================================
# TAHAP 2: RUNNER (Image Produksi Ultra-Ringan Berbasis Alpine)
# ==============================================================================
FROM alpine:3.20 AS runner
WORKDIR /app

# Hanya pasang library C++ minimal yang dibutuhkan binary & wget untuk healthcheck
RUN apk add --no-cache libstdc++ libgcc wget

# Buat user non-root bun (UID 1000) demi keamanan
RUN addgroup -g 1000 bun && adduser -u 1000 -G bun -s /bin/sh -D bun

# Salin HANYA file binary 'server' dan aset statis 'public/'
# FOLDER node_modules DAN COMPILER BUN DIBUANG SEPENUHNYA!
COPY --from=builder /build/server ./server
COPY public ./public

# Siapkan direktori penyimpanan database SQLite
RUN mkdir -p /app/data && chown -R bun:bun /app

USER bun

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/todos.db

EXPOSE 3000

# Docker Healthcheck bawaan
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Jalankan langsung binary mandiri hasil kompilasi
CMD ["./server"]
