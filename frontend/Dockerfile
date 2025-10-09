FROM node:18-alpine as build

WORKDIR /app

# Copy shared folder first (required for @shared imports)
COPY ./shared /shared

# Copy package files
COPY ./frontend/package*.json ./

# Install dependencies with legacy peer deps to resolve Angular version conflicts
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY ./frontend .

# Build for production
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist/coffee-admin/browser /usr/share/nginx/html

# Copy nginx configuration
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 4000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
