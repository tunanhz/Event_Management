import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash?: string; // Optional if registered via Google OAuth
  phone?: string;
  role: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT' | 'STAFF';
  accountStatus: 'ACTIVE' | 'BANNED' | 'PENDING';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // optional for Google Sign-in
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['ADMIN', 'ORGANIZER', 'PARTICIPANT', 'STAFF'],
      default: 'PARTICIPANT',
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'BANNED', 'PENDING'],
      default: 'ACTIVE',
    },
    avatar: { type: String },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('passwordHash')) return;
  if (!user.passwordHash) return;

  try {
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  } catch (err: any) {
    throw err;
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);

