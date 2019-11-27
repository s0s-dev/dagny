FROM node:10

# create app directory
WORKDIR /usr/src/app

# install dependencies
COPY package*.json ./

RUN npm install

COPY . .

RUN curl http://www.alanunderwood.com/download/dagny-secret.js > ./lib/bot-secret.js

# bundle app source 

EXPOSE 80

CMD [ "node", "dagny.js" ]
