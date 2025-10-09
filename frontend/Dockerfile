FROM node:18-alpine

WORKDIR /app

# Copy shared folder first (required for @shared imports)
COPY ./shared /shared

# Copy package files
COPY ./frontend/package*.json ./

# Install dependencies with legacy peer deps to resolve Angular version conflicts
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY ./frontend .

# Build for production with SSR
RUN npm run build

# Expose port for SSR server
EXPOSE 4000

# Start SSR server
CMD ["npm", "run", "serve:ssr"]
