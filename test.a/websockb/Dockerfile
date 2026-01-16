FROM node:latest AS base

WORKDIR /src
COPY package*.json .
RUN npm install

# FROM base AS dev
COPY ./ ./
RUN npm run build 

FROM node:20-alpine AS production

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY --from=base /src/dist ./
COPY ./index.html ./

CMD ["node", "server.js"]