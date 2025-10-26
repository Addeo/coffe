FROM node:18-alpine

# Install Python, build dependencies, and wget for health checks
RUN apk add --no-cache python3 py3-pip build-base wget

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
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
