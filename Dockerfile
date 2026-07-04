# PostFlow — production image (web + worker share this image).
# Debian base so we can install ffmpeg (cover frames) + openssl (Prisma).
FROM node:22-bookworm-slim

# System deps: ffmpeg for cover generation, openssl for Prisma engine,
# libatomic1 for some native addons.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ffmpeg openssl libatomic1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies. `npm install` (not `npm ci`) resolves the linux-specific
# optional native deps that a macOS-generated lockfile lacks, and runs the
# `postinstall` (prisma generate). NODE_ENV stays unset here so devDependencies
# (needed by `next build`) are installed.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# Build the Next.js app.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Web service uses this. The worker service overrides the start command with
# `npm run worker` in Railway (Settings → Deploy → Custom Start Command).
CMD ["npm", "run", "start"]
