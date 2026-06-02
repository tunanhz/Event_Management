import { User, IUser } from './user.model';

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password').lean();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean();
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id).lean();
  }
}
