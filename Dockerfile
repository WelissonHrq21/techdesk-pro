FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://user:password@localhost:5432/techdesk?schema=public" npm ci

COPY . .

RUN DATABASE_URL="postgresql://user:password@localhost:5432/techdesk?schema=public" npx prisma generate
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./
RUN DATABASE_URL="postgresql://user:password@localhost:5432/techdesk?schema=public" npm ci --omit=dev
RUN DATABASE_URL="postgresql://user:password@localhost:5432/techdesk?schema=public" npx prisma generate

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3333

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
