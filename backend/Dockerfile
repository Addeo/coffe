FROM node:18-alpine

# Install Python and build dependencies for native modules
RUN apk add --no-cache python3 py3-pip build-base

WORKDIR /app

# Copy package files
COPY package*.json ./

# DTO files are already copied in src/dtos/

# Install dependencies (including shared)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
