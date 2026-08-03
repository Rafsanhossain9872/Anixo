# TenZora - Online Users Server (Docker)

FROM node:20-alpine

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 7861

# Start server
CMD ["npm", "start"]
