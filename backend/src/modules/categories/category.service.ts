import { Types } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/AppError';
import { Department, normalizeName } from '../departments/department.model';
import { Category } from './category.model';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

async function assertDepartmentExists(id: string): Promise<void> {
  if (!(await Department.exists({ _id: id }))) {
    throw new BadRequestError('The referenced department does not exist.');
  }
}

export async function listCategories(
  opts: { includeInactive?: boolean; department?: string } = {},
): Promise<Serialized[]> {
  const filter: Record<string, unknown> = opts.includeInactive ? {} : { isActive: true };
  if (opts.department) filter.department = opts.department;
  const items = await Category.find(filter).populate('department', 'name').sort({ name: 1 });
  return items.map(serialize);
}

export async function createCategory(input: CreateCategoryInput): Promise<Serialized> {
  const normalizedName = normalizeName(input.name);
  if (await Category.exists({ normalizedName })) {
    throw new ConflictError(`A category named '${input.name}' already exists.`);
  }
  if (input.department) await assertDepartmentExists(input.department);

  const category = await Category.create({
    name: input.name,
    department: input.department ?? null,
  });
  return serialize(category);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Serialized> {
  const category = await Category.findById(id);
  if (!category) throw new NotFoundError('Category not found.');

  if (input.name !== undefined) {
    const normalizedName = normalizeName(input.name);
    if (await Category.exists({ normalizedName, _id: { $ne: category._id } })) {
      throw new ConflictError(`A category named '${input.name}' already exists.`);
    }
    category.name = input.name;
    category.normalizedName = normalizedName;
  }
  if (input.department !== undefined) {
    if (input.department) await assertDepartmentExists(input.department);
    category.department = input.department ? new Types.ObjectId(input.department) : null;
  }
  if (input.isActive !== undefined) category.isActive = input.isActive;

  await category.save();
  return serialize(category);
}
