import { CategoryRepository } from './category.repository';
import { ICategory } from './category.model';
import { AppError } from '../../common/utils/AppError';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async getAllCategories(): Promise<ICategory[]> {
    return this.categoryRepository.findAll();
  }

  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    const { name, slug, icon } = data;
    if (!name || !slug || !icon) {
      throw new AppError('name, slug, and icon are required', 400);
    }

    const existing = await this.categoryRepository.findBySlug(slug.toLowerCase().trim());
    if (existing) {
      throw new AppError('Category slug already exists', 409);
    }

    return this.categoryRepository.create(data);
  }

  async updateCategory(id: string, data: Partial<ICategory>): Promise<ICategory> {
    const category = await this.categoryRepository.update(id, data);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.delete(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
  }
}
