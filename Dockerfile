FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
RUN npm run check
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
