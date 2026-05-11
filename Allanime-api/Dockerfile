# Use Node.js as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
