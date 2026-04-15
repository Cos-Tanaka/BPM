FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/src ./src

# Copy frontend static files
COPY frontend ./frontend

# Create data directory for holidays
RUN mkdir -p data

EXPOSE 3030

CMD ["node", "src/app.js"]
