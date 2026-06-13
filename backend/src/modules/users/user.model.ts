import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';
import { Role, ROLES, UserStatus, USER_STATUSES } from '../../common/types/index';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: Role.Employee, index: true },
    status: {
      type: String,
      enum: USER_STATUSES,
      required: true,
      default: UserStatus.Pending,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      // Mandatory for employees; engineers/admins may be department-less.
      required: function (this: { role: Role }): boolean {
        return this.role === Role.Employee;
      },
    },
    // Bumped to invalidate all outstanding refresh tokens (logout-all, reset, disable).
    refreshTokenVersion: { type: Number, required: true, default: 0 },
    mustResetPassword: { type: Boolean, required: true, default: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    lastLoginAt: { type: Date },
    // Brute-force protection (hidden from API responses).
    failedLoginAttempts: { type: Number, required: true, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// Defense-in-depth: never serialize sensitive fields even if explicitly selected.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret._id;
    return ret;
  },
});

export type UserSchemaType = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserSchemaType>;

// Guard against model re-compilation (hot reload / repeated test imports).
export const User: Model<UserSchemaType> =
  (mongoose.models.User as Model<UserSchemaType> | undefined) ??
  model<UserSchemaType>('User', userSchema);
