FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose ports for Angular dev server and Ionic
EXPOSE 4200 8100

# Start Angular dev server
CMD ["npm", "start"]
