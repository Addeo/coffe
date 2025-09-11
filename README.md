# Coffee Admin Panel

A modern admin panel built with Angular/Ionic frontend and NestJS backend, containerized with Docker for easy deployment.

## 🌐 Live Demo

🚀 **Frontend Demo**: [GitHub Pages](https://addeo.github.io/coffe/)
🚀 **Backend API**: [Render](https://coffee-admin-demo-backend.onrender.com) (if deployed)

### Demo Features

- ✅ User Authentication
- ✅ Organization Management (CRUD)
- ✅ Responsive Design
- ✅ Mobile Compatible
- ✅ Real-time Updates

### Test Accounts

- **Admin**: admin@coffee.com / password
- **Manager**: manager@coffee.com / password
- **Engineer**: engineer@coffee.com / password

## 🏗️ Architecture

- **Frontend**: Angular 17+ with Ionic Framework for mobile compatibility
- **Backend**: NestJS with TypeScript and MySQL
- **Database**: MySQL 8.0
- **Containerization**: Docker & Docker Compose
- **Shared Types**: TypeScript interfaces and DTOs

## 📋 Development Rules

### Frontend (Angular + Ionic)

- **Version**: Latest Angular (17+)
- **UI Library**: Angular Material + Ionic components
- **Components**: Standalone components only
- **Styling**: SCSS with component-scoped styles
- **File Structure**: `component-name.component.ts`, `component-name.component.html`, `component-name.component.scss`
- **State Management**: Angular Signals
- **Forms**: Reactive Forms with validation

### Backend (NestJS)

- **ORM**: TypeORM with MySQL
- **Validation**: class-validator + class-transformer
- **Authentication**: JWT
- **Architecture**: Modular structure with controllers, services, entities

### Shared Types

- **Location**: `shared/` directory
- **Structure**: Organized by domain (`dtos/`, `interfaces/`, `types/`)
- **Usage**: Used by both frontend and backend for type safety

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Development Setup

1. **Clone and setup**:

   ```bash
   git clone <repository-url>
   cd coffee-admin-panel
   ```

2. **Start with Docker**:

   ```bash
   npm run dev
   ```

3. **Or run locally**:

   ```bash
   # Backend
   cd backend && npm install && npm run start:dev

   # Frontend
   cd frontend && npm install && npm start
   ```

### Access Points

- **Frontend**: http://localhost:4200 (Angular dev server)
- **Backend API**: http://localhost:3000
- **MySQL**: localhost:3307

### Default Admin User

- **Email**: admin@coffee.com
- **Password**: password
- **Role**: Admin

**Важно**: После первого запуска системы админ пользователь будет автоматически создан в базе данных. Используйте эти учетные данные для входа в систему.

#### Ручное добавление админа

Если нужно добавить админа вручную, используйте скрипт:

```bash
# Через Docker
docker exec coffee_mysql mysql -u coffee_user -pcoffee_password coffee_admin < create_admin.sql

# Или через локальный MySQL клиент
mysql -h localhost -P 3307 -u coffee_user -pcoffee_password coffee_admin < create_admin.sql
```

Пароль захеширован с помощью bcrypt: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`

## 📁 Project Structure

```
coffee-admin-panel/
├── frontend/                 # Angular/Ionic application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # Standalone components
│   │   │   ├── services/     # API services
│   │   │   ├── guards/       # Route guards
│   │   │   └── pages/        # Ionic pages
│   │   └── assets/
│   ├── Dockerfile
│   └── package.json
├── backend/                  # NestJS application
│   ├── src/
│   │   ├── modules/          # Feature modules
│   │   ├── entities/         # TypeORM entities
│   │   ├── dto/             # Data Transfer Objects
│   │   └── config/          # Configuration
│   ├── Dockerfile
│   └── package.json
├── shared/                   # Shared types and interfaces
│   ├── dtos/
│   ├── interfaces/
│   └── types/
├── docker/
│   └── mysql/
│       └── init.sql
├── docker-compose.yml
└── package.json
```

## 🛠️ Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Imports**: Absolute paths with `@/` prefix
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Files**: kebab-case for filenames

### Component Structure

```typescript
// user-profile.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent {
  private userService = inject(UserService);

  user = signal<User | null>(null);

  ngOnInit() {
    this.loadUser();
  }

  private loadUser() {
    this.userService.getCurrentUser().subscribe(user => {
      this.user.set(user);
    });
  }
}
```

### API Service Structure

```typescript
// user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDto } from '@shared/dtos/user.dto';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = '/api/users';

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/${id}`);
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend
```

## 📦 Deployment

### Production Build

```bash
# Build all services
npm run build

# Or build individually
npm run build:frontend
npm run build:backend
```

### Docker Deployment

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Follow the established code style
2. Use standalone components
3. Maintain type safety
4. Add tests for new features
5. Update documentation

## 📄 License

This project is licensed under the MIT License.

admin@coffee.com
password
