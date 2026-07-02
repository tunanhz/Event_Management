import { Banner, IBanner } from './banner.model';

export class BannerRepository {
  async findActive(): Promise<IBanner[]> {
    return Banner.find({ isActive: true }).sort({ order: 1 }).lean();
  }

  async findAll(): Promise<IBanner[]> {
    return Banner.find().sort({ order: 1 }).lean();
  }

  async create(data: Partial<IBanner>): Promise<IBanner> {
    const banner = new Banner(data);
    return banner.save();
  }

  async update(id: string, data: Partial<IBanner>): Promise<IBanner | null> {
    return Banner.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<IBanner | null> {
    return Banner.findByIdAndDelete(id).lean();
  }
}
