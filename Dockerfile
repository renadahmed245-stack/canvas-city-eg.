FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend ./
COPY frontend /app/frontend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
