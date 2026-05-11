# Use lightweight Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker caching)
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy all source code
COPY . .

# Hugging Face requires port 7860
EXPOSE 7860

# Set production environment
ENV NODE_ENV=production
ENV PORT=7860

# Start the server
CMD ["node", "src/server.js"]
