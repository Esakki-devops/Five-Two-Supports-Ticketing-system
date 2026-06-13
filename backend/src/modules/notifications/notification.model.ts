import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';
import { NOTIFICATION_TYPES } from '../../common/types/index';

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    message: { type: String, required: true },
    isRead: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    delete ret._id;
    return ret;
  },
});

export type NotificationSchemaType = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<NotificationSchemaType>;

export const Notification: Model<NotificationSchemaType> =
  (mongoose.models.Notification as Model<NotificationSchemaType> | undefined) ??
  model<NotificationSchemaType>('Notification', notificationSchema);
