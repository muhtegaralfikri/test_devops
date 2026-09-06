# ==============================================================================
# TAHAP 1: BUILDER (Bundle & Minify Native Bun Source)
# ==============================================================================
FROM oven/bun:1-alpine AS builder
WORKDIR /build

COPY tsconfig.json package.json ./
COPY src ./src

# Bundle & minify seluruh TypeScript native backend menjadi satu file JS kecil (~3.5 KB)
RUN bun build src/index.ts --target=bun --outdir=dist --minify

# ==============================================================================
# TAHAP 2: RUNNER (Ultra-Clean Production Image)
# ==============================================================================
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Salin HANYA file bundle index.js dan folder frontend public/
# Source code mentah TS, tsconfig, dan tools development dibuang sepenuhnya
COPY --from=builder /build/dist/index.js ./index.js
COPY public ./public

# Buat direktori data untuk SQLite & hak akses user non-root
RUN mkdir -p /app/data && chown -R bun:bun /app

USER bun

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/todos.db

EXPOSE 3000

# Healthcheck menggunakan fetch native bawaan Bun (cepat dan tanpa dependensi curl/wget)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Jalankan bundle native dengan mode ultra-low memory --smol
CMD ["bun", "--smol", "run", "index.js"]
