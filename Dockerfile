FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/techdesk?schema=public" npx prisma generate
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node prisma ./prisma
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/techdesk?schema=public" npx prisma generate

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3333

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
