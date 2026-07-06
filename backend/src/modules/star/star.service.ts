import { StarRepository } from './star.repository';
import { IStar } from './star.model';
import { AppError } from '../../common/utils/AppError';

export class StarService {
  private starRepository: StarRepository;

  constructor() {
    this.starRepository = new StarRepository();
  }

  async getAllStars(): Promise<IStar[]> {
    return this.starRepository.findAll();
  }

  async createStar(data: Partial<IStar>): Promise<IStar> {
    const { name, slug, imageUrl } = data;
    if (!name || !slug || !imageUrl) {
      throw new AppError('name, slug, and imageUrl are required', 400);
    }

    const existing = await this.starRepository.findBySlug(slug.toLowerCase().trim());
    if (existing) {
      throw new AppError('Star slug already exists', 409);
    }

    return this.starRepository.create(data);
  }

  async updateStar(id: string, data: Partial<IStar>): Promise<IStar> {
    const star = await this.starRepository.update(id, data);
    if (!star) {
      throw new AppError('Star not found', 404);
    }
    return star;
  }

  async deleteStar(id: string): Promise<void> {
    const star = await this.starRepository.delete(id);
    if (!star) {
      throw new AppError('Star not found', 404);
    }
  }
}
