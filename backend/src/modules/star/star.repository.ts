import { Star, IStar } from './star.model';

export class StarRepository {
  async findAll(): Promise<IStar[]> {
    return Star.find().sort({ order: 1 }).lean();
  }

  async findBySlug(slug: string): Promise<IStar | null> {
    return Star.findOne({ slug }).lean();
  }

  async create(data: Partial<IStar>): Promise<IStar> {
    const star = new Star(data);
    return star.save();
  }

  async update(id: string, data: Partial<IStar>): Promise<IStar | null> {
    return Star.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<IStar | null> {
    return Star.findByIdAndDelete(id).lean();
  }
}
