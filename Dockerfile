# STAGE 1: Build the Application
FROM node:20-alpine AS build

# Instala bash para ejecutar scripts complejos
RUN apk add --no-cache bash curl

WORKDIR /usr/src/app

# Copia e instala dependencias
COPY package*.json ./
RUN npm ci

# Copia el código fuente
COPY prisma ./prisma/
COPY tsconfig.json .
COPY src ./src

# Genera Prisma Client (necesario para la compilación)
RUN npx prisma generate

# Compila TypeScript
RUN npm run build

# STAGE 2: Run the Application (Final Image)
FROM node:20-alpine AS final

WORKDIR /usr/src/app

# Instala solo las dependencias de producción y de ejecución (wait-on)
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/package*.json /usr/src/app/

# Copia los archivos compilados y el esquema de Prisma
COPY --from=build /usr/src/app/dist /usr/src/app/dist
COPY prisma/schema.prisma ./prisma/

# Exponemos el puerto
EXPOSE 4000

CMD ["sh", "-c", "npx wait-on tcp:db:5432 -t 30000 && npx prisma db push && node dist/server.js"]