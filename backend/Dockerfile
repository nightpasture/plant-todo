FROM node:20-alpine

WORKDIR /app
COPY package.json .
RUN npm install

COPY server.js .
RUN mkdir data

EXPOSE 3000
CMD ["node", "server.js"]
