import type { Infer, productCreateShape } from '@wroom/shared';

import { ProductModel, type ProductDocument } from '../models/Product.js';
import { ProjectModel } from '../models/Project.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import type { Pagination } from '../utils/http.js';
import { containsFilter } from '../utils/query.js';

type ProductInput = Infer<typeof productCreateShape>;

export type ProductListFilters = {
  status?: string;
  search?: string;
};

export async function listProducts(
  filters: ProductListFilters,
  pagination: Pagination,
): Promise<{ items: ProductDocument[]; total: number }> {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) query.name = containsFilter(filters.search);

  const [items, total] = await Promise.all([
    ProductModel.find(query).sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit),
    ProductModel.countDocuments(query),
  ]);

  return { items, total };
}

export async function getProduct(id: string): Promise<ProductDocument> {
  const product = await ProductModel.findById(id);
  if (!product) throw new NotFoundError('That product');
  return product;
}

export async function createProduct(input: ProductInput): Promise<ProductDocument> {
  await assertSlugFree(input.slug);
  return ProductModel.create(input);
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<ProductDocument> {
  const product = await getProduct(id);
  if (input.slug && input.slug !== product.slug) await assertSlugFree(input.slug, id);

  product.set(input);
  await product.save();
  return product;
}

/**
 * Deleting a product with projects under it would orphan them, so it is refused
 * rather than cascaded — archive the product instead.
 */
export async function deleteProduct(id: string): Promise<void> {
  const product = await getProduct(id);
  const projectCount = await ProjectModel.countDocuments({ productId: product._id });

  if (projectCount > 0) {
    throw new ConflictError(
      `This product still has ${projectCount} project(s). Move or delete them first, or set the product to archived.`,
      { projectCount },
    );
  }

  await product.deleteOne();
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const clash = await ProductModel.findOne({ slug }).select('_id');
  if (clash && String(clash._id) !== exceptId) {
    throw new ConflictError(`The slug '${slug}' is already used by another product.`);
  }
}
