FROM node:22-alpine AS builder 

RUN npm install -g pnpm

WORKDIR /app

COPY ./src/backend/package.json .
COPY ./src/backend/pnpm-lock.yaml .

RUN pnpm install

COPY ./src/backend /app

RUN pnpm build

FROM gcr.io/distroless/nodejs22-debian12 AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["/app/dist/index.js"]