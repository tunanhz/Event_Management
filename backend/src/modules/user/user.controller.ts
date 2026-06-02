import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    // TODO: Get user ID from auth middleware
    const userId = req.params.id;
    const user = await this.userService.getUserById(userId);
    res.json(ApiResponse.ok(user, 'User profile retrieved'));
  });

  updateProfile = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const userId = req.params.id;
    const user = await this.userService.updateUser(userId, req.body);
    res.json(ApiResponse.ok(user, 'User profile updated'));
  });

  deleteAccount = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const userId = req.params.id;
    await this.userService.deleteUser(userId);
    res.json(ApiResponse.ok(null, 'User account deleted'));
  });
}
