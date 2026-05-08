import prisma from '../../lib/prisma';
import { CreateBranchInput, UpdateBranchInput } from './branches.schema';

export async function listBranches() {
  return prisma.branch.findMany({ orderBy: { name: 'asc' } });
}

export async function getBranch(id: string) {
  return prisma.branch.findUnique({ where: { id } });
}

export async function createBranch(data: CreateBranchInput) {
  return prisma.branch.create({ data });
}

export async function updateBranch(id: string, data: UpdateBranchInput) {
  return prisma.branch.update({ where: { id }, data });
}

export async function deactivateBranch(id: string) {
  return prisma.branch.update({ where: { id }, data: { isActive: false } });
}
