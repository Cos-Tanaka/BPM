FROM node:18-slim

ENV TZ=Asia/Tokyo
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Create data directory for holidays
RUN mkdir -p data

EXPOSE 3030

CMD ["node", "backend/src/app.js"]
