import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'organizer' | 'admin';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user',
    },
    avatar: { type: String },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
