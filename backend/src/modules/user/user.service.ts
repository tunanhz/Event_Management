import { UserRepository } from './user.repository';
import { IUser } from './user.model';
import { AppError } from '../../common/utils/AppError';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(data: Partial<IUser>): Promise<IUser> {
    const existingUser = await this.userRepository.findByEmail(data.email!);
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }
    return this.userRepository.create(data);
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.delete(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
  }
}
