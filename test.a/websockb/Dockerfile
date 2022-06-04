FROM node:latest AS base

WORKDIR /src
COPY ./package*.json .

FROM base AS dev
RUN npm install
COPY ./ ./

CMD ["node", "websockb.js"]