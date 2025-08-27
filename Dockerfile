# ===== build client =====
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/pnpm-lock.yaml* client/package-lock.json* client/yarn.lock* ./
RUN npm i || yarn || pnpm i
COPY client/ .
RUN npm run build || yarn build || pnpm build

# ===== build server =====
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml* server/package-lock.json* server/yarn.lock* ./
RUN npm i || yarn || pnpm i
COPY server/ .
RUN npm run build || yarn build || pnpm build

# ===== runtime =====
FROM node:20-alpine
WORKDIR /app

# copy server dist & prisma
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/prisma ./server/prisma
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client/dist ./client/dist

# env + ports
ENV API_PORT=8787
EXPOSE 8787

# simple static serve for client (optional, via fastify-static in server, лучше — отдавать сервером)
# Предполагаем, что твой сервер уже умеет отдавать /client/dist как статику.
CMD ["node", "server/dist/index.js"]
