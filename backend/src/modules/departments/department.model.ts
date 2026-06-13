import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

/** Normalize a department/category name for case-insensitive uniqueness. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Lowercased/trimmed form with a unique index → prevents "IT" vs "It " duplicates.
    // Derived from `name` at creation; the reference-data service re-normalizes on rename.
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      default: function (this: { name?: string }): string {
        return normalizeName(this.name ?? '');
      },
    },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

departmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    delete ret._id;
    delete ret.normalizedName;
    return ret;
  },
});

export type DepartmentSchemaType = InferSchemaType<typeof departmentSchema>;
export type DepartmentDocument = HydratedDocument<DepartmentSchemaType>;

export const Department: Model<DepartmentSchemaType> =
  (mongoose.models.Department as Model<DepartmentSchemaType> | undefined) ??
  model<DepartmentSchemaType>('Department', departmentSchema);
