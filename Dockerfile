FROM node:alpine3.11

ENV NODE_ENV ''
ENV NODE_PORT ''

RUN mkdir -p /app && chown node:node /app
WORKDIR /app
COPY package*.json ./
USER node

RUN npm ci

COPY --chown=node:node . .

RUN npm run tsc

EXPOSE 3030

CMD [ "npm", "run", "run-prod"]

