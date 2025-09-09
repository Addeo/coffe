# Authentication API

## Authentication Endpoints

### POST /auth/login
User authentication.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

## Endpoint Protection

To protect endpoints, use the following guards:

### JWT Guard
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData() {
  // This endpoint requires authentication
}
```

### Roles Guard
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin-only')
getAdminData() {
  // This endpoint is available only to admins
}
```

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=coffee_password
DB_DATABASE=coffee_admin
```

## User Roles

- `ADMIN` - Administrator (full access)
- `MANAGER` - Manager (order and product management)
- `USER` - User (view and basic operations)

## Getting Started

1. Set up environment variables (copy `env.example` to `.env`)
2. Start the MySQL database
3. Run migrations: `npm run migration:run`
4. Start the server: `npm run start:dev`

## Testing

```bash
# Run all tests
npm run test

# Run E2E tests
npm run test:e2e
```
