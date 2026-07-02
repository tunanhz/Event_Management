import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.categoryService.getAllCategories();
    res.json(ApiResponse.ok(categories, 'Categories retrieved successfully'));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const category = await this.categoryService.createCategory(req.body);
    res.status(201).json(ApiResponse.created(category));
  });

  update = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const category = await this.categoryService.updateCategory(req.params.id, req.body);
    res.json(ApiResponse.ok(category, 'Category updated successfully'));
  });

  delete = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    await this.categoryService.deleteCategory(req.params.id);
    res.json(ApiResponse.ok(null, 'Category deleted successfully'));
  });
}
