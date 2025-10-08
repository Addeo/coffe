import { HttpException, HttpStatus } from '@nestjs/common';

export interface UserDeletionConflict {
  table: string;
  count: number;
  description: string;
}

export class UserDeletionException extends HttpException {
  constructor(conflicts: UserDeletionConflict[]) {
    const message = 'Cannot delete user due to existing dependencies';
    super(
      {
        message,
        conflicts,
        error: 'USER_DELETION_CONFLICT',
      },
      HttpStatus.CONFLICT
    );
  }
}
