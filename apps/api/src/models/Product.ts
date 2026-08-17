import { PRODUCT_STATUSES } from '@wroom/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    /** No clients collection — a flag plus free-text name is enough. */
    isClientWork: { type: Boolean, default: false },
    clientName: { type: String, default: null },
    /** Blocks portfolio publishing for every project under this product. */
    ndaRestricted: { type: Boolean, default: false },
    status: { type: String, enum: PRODUCT_STATUSES as unknown as string[], default: 'active' },
  },
  { timestamps: true, collection: 'products' },
);

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product>;

export const ProductModel = model('Product', productSchema);
