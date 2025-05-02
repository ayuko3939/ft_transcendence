FROM node:22-slim

RUN npm install -g pnpm

WORKDIR /app

COPY ./database/package.json .
COPY ./database/*.ts .

RUN pnpm install && \
    pnpm run initialize

ENTRYPOINT [ "node" ]
CMD [ "-e", "console.log(\"All done!\")" ]