# ?? Panduan Belajar DevOps: Dari Lokal ke Production Server
### Proyek: Todo List Web App (Bun + Express + Docker + CI/CD)

Selamat datang! Repository ini dibuat khusus untuk memandu Anda memahami **alur kerja DevOps modern** dari tahap koding di komputer lokal hingga aplikasi berjalan otomatis di server produksi (VPS / Cloud).

---

## ??? Gambaran Alur DevOps (The Big Picture)

Dalam pengembangan tradisional, developer sering menghadapi masalah klise:
> *"Di laptop saya jalan kok, pas ditaruh di server malah error!"*

DevOps menyelesaikan masalah ini dengan 4 pilar utama:

```
[1. Koding Lokal] --> [2. Kontainerisasi] --> [3. Automasi CI/CD] --> [4. Server Produksi]
   (Bun + Express)      (Docker / Compose)     (GitHub/GitLab CI)       (VPS Ubuntu + SSL)
```

1. **Kode di Lokal**: Kita membangun aplikasi dengan runtime **Bun** dan framework **Express**.
2. **Bungkus dengan Docker**: Kode dibungkus menjadi *Container Image* mandiri yang membawa semua library yang dibutuhkan (OS, runtime, dependensi). Jika jalan di Docker lokal, dijamin jalan di Docker server.
3. **Otomatisasi via CI/CD**: Setiap kali Anda melakukan `git push`:
   - **CI (Continuous Integration)**: Server otomatis menjalankan unit test (`bun test`). Jika ada bug/gagal, pipeline batal.
   - **CD (Continuous Delivery & Deployment)**: Membangun Docker image, menyimpannya di Container Registry (GHCR/GitLab Registry), lalu menghubungi VPS via SSH untuk memperbarui container tanpa downtime manual.
4. **Production Server**: VPS hanya perlu menjalankan Docker Compose di balik reverse proxy (seperti Nginx) dan sertifikat SSL gratis (Certbot).

---

## ??? Struktur Direktori Proyek

```bash
test_devops/
+-- .github/
¦   +-- workflows/
¦       +-- ci-cd.yml         # Pipeline CI/CD GitHub Actions
+-- .gitlab-ci.yml            # Alternatif pipeline untuk GitLab CI
+-- Dockerfile                # Resep pembuatan container image (Alpine Bun)
+-- docker-compose.yml        # Konfigurasi container, port, dan volume data
+-- .dockerignore             # File yang diabaikan saat build Docker
+-- src/
¦   +-- db.ts                 # Database SQLite mandiri (bun:sqlite)
¦   +-- index.ts              # Entrypoint server Express & API routes
¦   +-- index.test.ts         # Automated test untuk tahap CI
+-- public/
¦   +-- index.html            # Antarmuka web modern
¦   +-- style.css             # Desain responsive dengan dark theme
¦   +-- app.js                # Logika frontend & health check monitor
+-- package.json              # Dependensi & script aplikasi
+-- tsconfig.json             # Konfigurasi TypeScript untuk Bun
```

---

## ?? 1. Menjalankan di Komputer Lokal

### A. Menggunakan Bun (Mode Development)

1. **Install dependensi**:
   ```bash
   bun install
   ```

2. **Jalankan automated test**:
   ```bash
   bun test
   ```

3. **Jalankan server pengembangan (Hot Reload)**:
   ```bash
   bun run dev
   ```
   Buka browser di: `http://localhost:3000`

---

### B. Menggunakan Docker di Komputer Lokal

Jika Anda sudah menginstal Docker Desktop:

1. **Build & jalankan kontainer**:
   ```bash
   docker compose up -d --build
   ```

2. **Cek status kontainer**:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

3. **Hentikan kontainer**:
   ```bash
   docker compose down
   ```

> ?? **Catatan Volume**: Data todo disimpan di folder `./data/todos.db` secara persisten. Walaupun kontainer dihapus dan dibuat ulang, data tidak akan hilang karena adanya konfigurasi `volumes: ./data:/app/data`.

---

## ?? 2. Penjelasan Pipeline CI/CD

### Mengapa Memisahkan CI dan CD?

1. **CI (Continuous Integration)**:
   - **Tugas**: Validasi kode baru.
   - Di file `.github/workflows/ci-cd.yml`, job `test` menginstal Bun dan menjalankan `bun test`.
   - **Tujuan**: Mencegah kode yang rusak masuk ke server produksi.

2. **CD (Continuous Delivery / Deployment)**:
   - **Tugas 1 (Delivery)**: Build Docker image dan push ke **GitHub Container Registry (`ghcr.io`)**.
   - **Tugas 2 (Deployment)**: Menghubungi VPS via SSH, melakukan `docker compose pull`, dan merestart kontainer dengan versi terbaru.

---

## ?? 3. Panduan Setup VPS Produksi (Langkah Nyata)

Berikut adalah panduan lengkap menyiapkan VPS (misalnya Ubuntu 22.04 / 24.04 di DigitalOcean, AWS EC2, GCP, atau provider lokal):

### Langkah 1: Persiapan Server VPS
Masuk ke VPS via SSH di terminal Anda:
```bash
ssh root@IP_SERVER_ANDA
```

Update package & install Docker:
```bash
sudo apt update && sudo apt upgrade -y
# Install Docker & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Langkah 2: Buat Folder Proyek di VPS
```bash
mkdir -p ~/todo-app/data
cd ~/todo-app
```
Salin file `docker-compose.yml` ke dalam folder tersebut di server:
```bash
nano docker-compose.yml
```
*(Ganti nama image di `docker-compose.yml` server menjadi: `ghcr.io/<username-github>/todo-devops-bun:latest`)*

### Langkah 3: Konfigurasi GitHub Secrets
Agar GitHub Actions bisa deploy ke VPS secara otomatis, buka repository GitHub Anda:
1. Masuk ke **Settings** > **Secrets and variables** > **Actions**.
2. Klik **New repository secret** dan tambahkan:
   - `SERVER_HOST`: IP publik VPS Anda (misal: `103.123.45.67`).
   - `SERVER_USER`: User VPS Anda (misal: `root` atau `ubuntu`).
   - `SERVER_SSH_KEY`: Isi dengan Private Key SSH Anda (`id_ed25519` atau `id_rsa`).
   - `SERVER_PORT`: Port SSH (biasanya `22`).

Setiap kali Anda melakukan `git push origin main`, GitHub Actions akan:
1. Menjalankan test.
2. Membuild Docker image dan menyimpannya di GHCR.
3. SSH ke VPS Anda dan menjalankan versi terbaru secara otomatis!

---

## ?? 4. Production Best Practice: Reverse Proxy (Nginx + SSL)

Jangan mengekspos port aplikasi internal (seperti 3000) langsung ke publik. Gunakan **Nginx** sebagai pintu depan (*Reverse Proxy*):

```nginx
server {
    server_name todo.namadomainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Dapatkan sertifikat SSL HTTPS gratis dengan Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d todo.namadomainanda.com
```

---

## ?? Selamat Belajar!
Sekarang Anda memiliki pemahaman menyeluruh tentang bagaimana kode dari komputer Anda dikemas, diuji secara otomatis, dan dideploy ke server menggunakan standar industri DevOps.
