FROM node:10

# create app directory
WORKDIR /usr/src/app

# install dependencies
COPY package*.json ./

RUN npm install

# bundle app source 

COPY . .

EXPOSE 80

CMD [ "node", "dagny.js" ]
