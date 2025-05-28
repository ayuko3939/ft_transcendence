FROM node:22-slim AS builder 

RUN npm install -g pnpm

WORKDIR /app

COPY ./backend/package.json .

RUN pnpm install

COPY ./backend /app
COPY ./shared/ ./src/types/shared/

RUN pnpm build

FROM gcr.io/distroless/nodejs22-debian12 AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["/app/dist/index.js"]