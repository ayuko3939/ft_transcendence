FROM node:22-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

COPY ./src/frontend/package.json .
COPY ./src/frontend/pnpm-lock.yaml .

RUN pnpm install

COPY ./src/frontend /app

RUN pnpm build

EXPOSE 4173
