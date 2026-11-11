# Node.js 24.22.2 / Alpine 3.24.4, fixado por tag exata e digest (verificado em 2026-11-11).
ARG NODE_IMAGE=node:24.22.2-alpine3.24@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8

# base: imagem comum a todos os estágios
FROM ${NODE_IMAGE} AS base
WORKDIR /app

# deps: todas as dependências, instaladas somente pelo lockfile
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# dev: lint, typecheck, testes e build (código montado por bind mount no Compose)
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "test"]

# build: compila somente src/ para dist/ (tsconfig.build.json)
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# runtime: código compilado e apenas dependências de produção, sem root
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
