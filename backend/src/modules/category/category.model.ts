import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ order: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
