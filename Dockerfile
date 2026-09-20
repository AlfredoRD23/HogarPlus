FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
  && npm run build \
  && mkdir -p apps/api/public \
  && cp -R apps/web/dist/. apps/api/public/

ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push --schema=apps/api/prisma/schema.prisma --skip-generate && node apps/api/dist/src/main.js"]
