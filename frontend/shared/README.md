# Shared Types and DTOs

This folder is a copy of the root `shared/` folder for Docker build purposes.

## Why?

During Docker build, the build context is set to `./frontend`, so we need a local copy of shared types.

## Keeping in Sync

When you update types in the root `shared/` folder, run:

```bash
cp -r shared/ frontend/shared/
```

Or add this to your build pipeline.

## Imports

Use the `@shared` alias in your code:

```typescript
import { UserDto } from '@shared/dtos/user.dto';
import { OrderStatus } from '@shared/interfaces/order.interface';
```

The alias is configured in `tsconfig.json`.

