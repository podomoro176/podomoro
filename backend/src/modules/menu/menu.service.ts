import prisma from '../../lib/prisma';
import { CreateMenuItemInput, UpdateMenuItemInput, MenuQuery } from './menu.schema';

export async function listMenuItems(query: MenuQuery) {
  const { page, limit, category, branchId } = query;
  const skip = (page - 1) * limit;

  const where = {
    isAvailable: true,
    ...(category && { category }),
    ...(branchId && { branchId }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.menuItem.findMany({ where, skip, take: limit, orderBy: { category: 'asc' } }),
    prisma.menuItem.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getMenuItem(id: string) {
  return prisma.menuItem.findUnique({ where: { id } });
}

export async function createMenuItem(data: CreateMenuItemInput) {
  return prisma.menuItem.create({ data });
}

export async function updateMenuItem(id: string, data: UpdateMenuItemInput) {
  return prisma.menuItem.update({ where: { id }, data });
}

export async function deactivateMenuItem(id: string) {
  return prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
}
