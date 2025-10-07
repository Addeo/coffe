FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production with SSR
RUN npm run build

# Expose port for SSR server
EXPOSE 4000

# Start SSR server
CMD ["npm", "run", "serve:ssr"]
