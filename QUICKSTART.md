# 🚀 Quick Start Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local development)

## 1. Clone and Setup

```bash
git clone <your-repo-url>
cd coffee-admin-panel
```

## 2. Environment Setup

```bash
cp env.example .env
# Edit .env file with your configuration
```

## 3. Start with Docker

```bash
# Start all services
npm run dev

# Or use docker directly
docker-compose up --build
```

## 4. Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001
- **MySQL**: localhost:3306

## 5. Default Admin Credentials

- **Email**: admin@coffee.com
- **Password**: admin123

## Development Workflow

### Frontend Development

```bash
cd frontend
npm install
npm start
```

### Backend Development

```bash
cd backend
npm install
npm run start:dev
```

### Shared Types

```bash
cd shared
npm run build
```

## Production Deployment

```bash
# Build for production
npm run build

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## Project Structure Overview

```
coffee-admin-panel/
├── frontend/          # Angular/Ionic SPA
├── backend/           # NestJS API
├── shared/           # TypeScript types & DTOs
├── docker/           # Docker configurations
└── docker-compose.yml # Development setup
```

## Key Features Implemented

✅ Angular 17+ with Ionic Framework
✅ Standalone Components
✅ Angular Material UI
✅ NestJS with TypeORM
✅ MySQL Database
✅ JWT Authentication
✅ Docker Containerization
✅ Shared Type Definitions
✅ ESLint & Prettier
✅ Development Guidelines

Happy coding! ☕
