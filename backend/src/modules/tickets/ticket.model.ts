import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';
import {
  AttachmentScanStatus,
  TicketPriority,
  TicketStatus,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../../common/types/index';

const attachmentSchema = new Schema(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true },
    scanStatus: {
      type: String,
      enum: Object.values(AttachmentScanStatus),
      default: AttachmentScanStatus.Pending,
      required: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const commentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    from: { type: String },
    to: { type: String },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 10000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isInternal: { type: Boolean, required: true, default: false },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      required: true,
      default: TicketPriority.Medium,
    },
    status: { type: String, enum: TICKET_STATUSES, required: true, default: TicketStatus.New },
    attachments: { type: [attachmentSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true },
);

// Compound indexes for the real filter combinations + full-text search.
ticketSchema.index({ status: 1, assignee: 1 });
ticketSchema.index({ department: 1, status: 1 });
ticketSchema.index({ requester: 1, createdAt: -1 });
ticketSchema.index({ title: 'text', description: 'text' });

ticketSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    delete ret._id;
    return ret;
  },
});

export type TicketSchemaType = InferSchemaType<typeof ticketSchema>;
export type TicketDocument = HydratedDocument<TicketSchemaType>;

export const Ticket: Model<TicketSchemaType> =
  (mongoose.models.Ticket as Model<TicketSchemaType> | undefined) ??
  model<TicketSchemaType>('Ticket', ticketSchema);
