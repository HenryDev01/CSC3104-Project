# Use Node.js to build the React app
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# Use lightweight web server to serve built files
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

## Use Node.js to build the React app
#FROM node:22-alpine
#WORKDIR /app
#COPY package*.json ./
#RUN npm install
#COPY . .
#ENV CHOKIDAR_USEPOLLING=true
#ENV NODE_ENV=development
#CMD ["npm", "start"]

