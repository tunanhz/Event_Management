import { BannerRepository } from './banner.repository';
import { IBanner } from './banner.model';
import { AppError } from '../../common/utils/AppError';

export class BannerService {
  private bannerRepository: BannerRepository;

  constructor() {
    this.bannerRepository = new BannerRepository();
  }

  async getActiveBanners(): Promise<IBanner[]> {
    return this.bannerRepository.findActive();
  }

  async getAllBanners(): Promise<IBanner[]> {
    return this.bannerRepository.findAll();
  }

  async createBanner(data: Partial<IBanner>): Promise<IBanner> {
    const { title, imageUrl } = data;
    if (!title || !imageUrl) {
      throw new AppError('title and imageUrl are required', 400);
    }
    return this.bannerRepository.create(data);
  }

  async updateBanner(id: string, data: Partial<IBanner>): Promise<IBanner> {
    const banner = await this.bannerRepository.update(id, data);
    if (!banner) {
      throw new AppError('Banner not found', 404);
    }
    return banner;
  }

  async deleteBanner(id: string): Promise<void> {
    const banner = await this.bannerRepository.delete(id);
    if (!banner) {
      throw new AppError('Banner not found', 404);
    }
  }
}
