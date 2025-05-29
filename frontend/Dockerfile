FROM node:22-slim AS builder 

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm

WORKDIR /shared
COPY ./shared .
RUN pnpm i && pnpm build

WORKDIR /app
COPY ./frontend/package.json .
RUN pnpm install
COPY ./frontend /app

RUN NEXT_BUILD=true pnpm build

FROM gcr.io/distroless/nodejs22-debian12 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

CMD ["./node_modules/next/dist/bin/next", "start"]