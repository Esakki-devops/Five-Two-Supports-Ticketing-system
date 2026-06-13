import { ConflictError, NotFoundError } from '../../core/errors/AppError';
import { Department, normalizeName } from './department.model';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './department.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

export async function listDepartments(
  opts: { includeInactive?: boolean } = {},
): Promise<Serialized[]> {
  const filter = opts.includeInactive ? {} : { isActive: true };
  const items = await Department.find(filter).sort({ name: 1 });
  return items.map(serialize);
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Serialized> {
  const normalizedName = normalizeName(input.name);
  if (await Department.exists({ normalizedName })) {
    throw new ConflictError(`A department named '${input.name}' already exists.`);
  }
  const dept = await Department.create({ name: input.name });
  return serialize(dept);
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
): Promise<Serialized> {
  const dept = await Department.findById(id);
  if (!dept) throw new NotFoundError('Department not found.');

  if (input.name !== undefined) {
    const normalizedName = normalizeName(input.name);
    if (await Department.exists({ normalizedName, _id: { $ne: dept._id } })) {
      throw new ConflictError(`A department named '${input.name}' already exists.`);
    }
    dept.name = input.name;
    dept.normalizedName = normalizedName;
  }
  if (input.isActive !== undefined) dept.isActive = input.isActive;

  await dept.save();
  return serialize(dept);
}
