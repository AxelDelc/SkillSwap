FROM node:20-alpine

WORKDIR /app

# Copie les fichiers de dépendances et le schéma Prisma en premier
# (optimise le cache Docker : npm install ne relance que si ces fichiers changent)
COPY package*.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

RUN npm ci && npx prisma generate

# Copie le reste du code source
COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node app.js"]
