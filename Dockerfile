FROM node:22 AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

ARG PUBLIC_EVENT_SOURCE_ONE
ARG PUBLIC_EVENT_SOURCE_TWO
ENV PUBLIC_EVENT_SOURCE_ONE=$PUBLIC_EVENT_SOURCE_ONE
ENV PUBLIC_EVENT_SOURCE_TWO=$PUBLIC_EVENT_SOURCE_TWO

RUN npm run build
RUN  npm prune --omit=dev --legacy-peer-deps

FROM oven/bun:1.1-slim
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "build/index.js"]