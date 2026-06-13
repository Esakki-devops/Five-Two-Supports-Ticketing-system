import mongoose, { Schema, model, type Model } from 'mongoose';

interface CounterDoc {
  _id: string; // sequence name
  seq: number;
}

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const Counter: Model<CounterDoc> =
  (mongoose.models.Counter as Model<CounterDoc> | undefined) ??
  model<CounterDoc>('Counter', counterSchema);

/** Atomically increment and return the next value of a named sequence. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );
  if (!doc) throw new Error(`Failed to generate sequence '${name}'`);
  return doc.seq;
}

/** Human-friendly, collision-free ticket id, e.g. TKT-000123. */
export async function nextTicketNumber(): Promise<string> {
  const seq = await nextSequence('ticketNumber');
  return `TKT-${String(seq).padStart(6, '0')}`;
}
