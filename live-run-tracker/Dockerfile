# Playwright's image ships Chromium + its system libraries, which the optional
# Garmin LiveTrack bridge (garmin.js) needs. Keep the tag in step with the
# `playwright` version in package.json.
FROM mcr.microsoft.com/playwright:v1.62.1-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
