import { User, IUser } from './user.model';
import { PaginatedResult } from '../../common/types';
import { isDbConnected } from '../../config/database';
import bcrypt from 'bcrypt';

// In-Memory fallback store
export let mockUsersStore: any[] = [];

// Helper to initialize mock data if store is empty
const initializeMockUsers = async () => {
  if (mockUsersStore.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('Admin@123456', salt);
    
    mockUsersStore = [
      {
        _id: 'mock-admin-id',
        fullName: 'System Admin',
        email: 'admin@eventbox.vn',
        passwordHash: hashedAdminPassword,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        phone: '0987654321',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'mock-admin-demo-id',
        fullName: 'Admin Demo',
        email: 'admin_demo@gmail.com',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        phone: '0901234567',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'mock-user-demo-id',
        fullName: 'User Demo',
        email: 'user_demo@gmail.com',
        role: 'PARTICIPANT',
        accountStatus: 'ACTIVE',
        phone: '0912345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
  }
};

const createMockUserDoc = (data: any) => {
  return {
    ...data,
    toJSON() {
      const copy = { ...this };
      delete copy.passwordHash;
      delete copy.comparePassword;
      delete copy.toJSON;
      return copy;
    },
    comparePassword: async function (candidatePassword: string): Promise<boolean> {
      if (!this.passwordHash) return false;
      return bcrypt.compare(candidatePassword, this.passwordHash);
    }
  } as any;
};

export class UserRepository {
  // Used for standard operations where password is not required and lean performance is preferred
  async findByEmail(email: string): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findOne({ email }).lean();
    }
    await initializeMockUsers();
    const user = mockUsersStore.find(u => u.email === email.toLowerCase().trim());
    return user ? createMockUserDoc(user) : null;
  }

  // Used specifically for auth since it returns password and mongoose document (to call comparePassword)
  async findByEmailForAuth(email: string): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findOne({ email }).select('+passwordHash');
    }
    await initializeMockUsers();
    const user = mockUsersStore.find(u => u.email === email.toLowerCase().trim());
    return user ? createMockUserDoc(user) : null;
  }

  async findById(id: string): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findById(id).lean();
    }
    await initializeMockUsers();
    const user = mockUsersStore.find(u => u._id === id);
    return user ? createMockUserDoc(user) : null;
  }

  // Used for endpoints that require mongoose document methods
  async findByIdDocument(id: string): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findById(id);
    }
    await initializeMockUsers();
    const user = mockUsersStore.find(u => u._id === id);
    return user ? createMockUserDoc(user) : null;
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    if (isDbConnected) {
      const user = new User(data);
      return user.save();
    }
    await initializeMockUsers();
    
    // Hash password if provided
    let passwordHash = data.passwordHash;
    if (passwordHash) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(passwordHash, salt);
    }

    const newUser = {
      _id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
      fullName: data.fullName,
      email: data.email?.toLowerCase().trim(),
      passwordHash,
      phone: data.phone,
      role: data.role || 'PARTICIPANT',
      accountStatus: data.accountStatus || 'ACTIVE',
      avatar: data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.fullName}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsersStore.push(newUser);
    return createMockUserDoc(newUser);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    }
    await initializeMockUsers();
    const idx = mockUsersStore.findIndex(u => u._id === id);
    if (idx === -1) return null;
    
    mockUsersStore[idx] = {
      ...mockUsersStore[idx],
      ...data,
      updatedAt: new Date(),
    };
    return createMockUserDoc(mockUsersStore[idx]);
  }

  async delete(id: string): Promise<IUser | null> {
    if (isDbConnected) {
      return User.findByIdAndDelete(id).lean();
    }
    await initializeMockUsers();
    const idx = mockUsersStore.findIndex(u => u._id === id);
    if (idx === -1) return null;
    const deleted = mockUsersStore.splice(idx, 1)[0];
    return createMockUserDoc(deleted);
  }

  // Admin account management query with filters, search and pagination
  async findAll(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResult<IUser>> {
    if (isDbConnected) {
      const { page = 1, limit = 10, role, status, search } = query;
      const filter: Record<string, any> = {};

      if (role) filter.role = role;
      if (status) filter.accountStatus = status;
      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [data, totalItems] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ]);

      return {
        data: data as IUser[],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: limit,
        },
      };
    }

    await initializeMockUsers();
    const { page = 1, limit = 10, role, status, search } = query;
    let filtered = [...mockUsersStore];

    if (role) {
      filtered = filtered.filter(u => u.role === role);
    }
    if (status) {
      filtered = filtered.filter(u => u.accountStatus === status);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(searchLower) || 
        u.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt desc
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalItems = filtered.length;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit).map(u => createMockUserDoc(u));

    return {
      data: paginated,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  // Check if system has any ADMIN accounts (used for Admin Bootstrap)
  async countAdmins(): Promise<number> {
    if (isDbConnected) {
      return User.countDocuments({ role: 'ADMIN' });
    }
    await initializeMockUsers();
    return mockUsersStore.filter(u => u.role === 'ADMIN').length;
  }
}

