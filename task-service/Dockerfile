FROM node:lts

EXPOSE 8000

WORKDIR /app

ADD . /app

RUN npm ci

CMD ["index.mjs"]
