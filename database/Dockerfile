FROM node:22-slim

RUN npm install -g pnpm

WORKDIR /app

COPY ./database/package.json .
RUN pnpm install

COPY ./database/*.ts .

COPY ./database/*.sh .
RUN chmod +x *.sh

ENTRYPOINT [ "node" ]
CMD [ "-e", "setInterval(() => {}, 60000);" ]
