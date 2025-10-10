# Stage 1: Build the application
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/dist/coffee-admin-frontend /usr/share/nginx/html

# Debug: Check current directory in build context
RUN echo "=== Build context files ===" && ls -la

# Copy nginx configuration (nginx.conf должен быть в той же директории что и Dockerfile)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify nginx config was copied
RUN echo "=== Nginx config verification ===" && \
    ls -la /etc/nginx/conf.d/ && \
    echo "=== Config content ===" && \
    cat /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]