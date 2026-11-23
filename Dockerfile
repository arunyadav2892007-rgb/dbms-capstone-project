FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY src/ ./src/
COPY frontend/ ./frontend/
COPY cpstone/ ./cpstone/
COPY ecommerce_recommendation.db ./

EXPOSE 8000

ENV PORT=8000
CMD ["node", "server.js"]
