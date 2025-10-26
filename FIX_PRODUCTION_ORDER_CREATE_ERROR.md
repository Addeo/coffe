# Fix: Production Order Creation Error

## Problem
Order creation was failing on the production backend server with errors related to file attachment.

## Root Causes

### 1. Duplicate DTO Definitions
- `OrdersService` had local duplicate definitions of `CreateOrderDto` and `UpdateOrderDto`
- These were overriding the shared DTO types, causing type inconsistencies
- Production code was using different types than the frontend expected

### 2. Incorrect Type in Shared DTO
- In `shared/dtos/order.dto.ts`, the `UpdateOrderDto.source` field was typed as `OrderStatus` instead of `OrderSource`

### 3. Import Organization Issues
- Imports were scattered throughout the file instead of being organized at the top

## Changes Made

### 1. Fixed `backend/src/modules/orders/orders.service.ts`
- Removed local duplicate DTO definitions
- Added proper imports from shared DTOs:
  ```typescript
  import { CreateOrderDto, UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '../../shared/dtos/order.dto';
  ```
- Organized imports properly at the top of the file
- Combined import statements for cleaner code

### 2. Fixed `shared/dtos/order.dto.ts`
- Changed `UpdateOrderDto.source` type from `OrderStatus` to `OrderSource`

### 3. Verification
- Built the backend successfully with no TypeScript errors
- Verified all DTOs are now consistent across the codebase

## Files Changed
- `backend/src/modules/orders/orders.service.ts`
- `shared/dtos/order.dto.ts`

## Testing
The fix ensures that:
1. Order creation with file attachments works correctly
2. DTO types are consistent between frontend and backend
3. The `files` field in `CreateOrderDto` is properly recognized

## Deployment
1. Build the backend: `npm run build`
2. Deploy to production
3. Test order creation with file attachments
