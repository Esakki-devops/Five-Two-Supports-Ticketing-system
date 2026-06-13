import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';
import { normalizeName } from '../departments/department.model';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      default: function (this: { name?: string }): string {
        return normalizeName(this.name ?? '');
      },
    },
    // Optional scoping to a department.
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

categorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    delete ret._id;
    delete ret.normalizedName;
    return ret;
  },
});

export type CategorySchemaType = InferSchemaType<typeof categorySchema>;
export type CategoryDocument = HydratedDocument<CategorySchemaType>;

export const Category: Model<CategorySchemaType> =
  (mongoose.models.Category as Model<CategorySchemaType> | undefined) ??
  model<CategorySchemaType>('Category', categorySchema);
