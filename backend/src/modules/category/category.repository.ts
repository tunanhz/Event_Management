import { Category, ICategory } from './category.model';

export class CategoryRepository {
  async findAll(): Promise<ICategory[]> {
    return Category.find().sort({ order: 1 }).lean();
  }

  async findById(id: string): Promise<ICategory | null> {
    return Category.findById(id).lean();
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    return Category.findOne({ slug }).lean();
  }

  async create(data: Partial<ICategory>): Promise<ICategory> {
    const category = new Category(data);
    return category.save();
  }

  async update(id: string, data: Partial<ICategory>): Promise<ICategory | null> {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<ICategory | null> {
    return Category.findByIdAndDelete(id).lean();
  }
}
