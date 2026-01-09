# Dockerfile
FROM node:20-bookworm-slim

# Install Chromium and required libraries for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to not download its own Chrome
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Tell Puppeteer where Chromium is inside this container
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Railway provides PORT, we just listen on it
EXPOSE 3000

CMD ["node", "server.js"]
