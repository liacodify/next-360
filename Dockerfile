# 1. Imagen base
FROM node:20-alpine AS builder

WORKDIR /app

# 2. Dependencias
COPY package*.json ./
RUN npm install

# 3. Código
COPY . .

# 4. Build Next.js
RUN npm run build

# =============================

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiamos solo lo necesario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]

