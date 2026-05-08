import prisma from '../../lib/prisma';
import { CreateDocumentInput, CreateVideoInput, CreateRecipeInput } from './sop.schema';

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(branchId: string) {
  return prisma.sopDocument.findMany({
    where: { branchId },
    include: { uploader: { select: { email: true } } },
    orderBy: { category: 'asc' },
  });
}

export async function createDocument(data: CreateDocumentInput & { filePath: string; fileType: string }, uploadedBy: string) {
  return prisma.sopDocument.create({ data: { ...data, uploadedBy } });
}

export async function completeDocument(documentId: string, userId: string) {
  const emp = await prisma.employee.findUnique({ where: { userId } });
  if (!emp) throw Object.assign(new Error('Employee record not found'), { statusCode: 404 });
  return prisma.documentCompletion.create({ data: { documentId, employeeId: emp.id } });
}

// ── Videos ────────────────────────────────────────────────────────────────────

export async function listVideos(branchId: string) {
  return prisma.sopVideo.findMany({
    where: { branchId },
    include: { uploader: { select: { email: true } } },
    orderBy: { category: 'asc' },
  });
}

export async function createVideo(data: CreateVideoInput, uploadedBy: string) {
  return prisma.sopVideo.create({ data: { ...data, uploadedBy } });
}

export async function completeVideo(videoId: string, userId: string) {
  const emp = await prisma.employee.findUnique({ where: { userId } });
  if (!emp) throw Object.assign(new Error('Employee record not found'), { statusCode: 404 });
  return prisma.videoCompletion.create({ data: { videoId, employeeId: emp.id } });
}

// ── Recipes ───────────────────────────────────────────────────────────────────

export async function listRecipes(branchId: string) {
  return prisma.recipe.findMany({
    where: { branchId },
    include: { ingredients: true },
    orderBy: { name: 'asc' },
  });
}

export async function createRecipe(data: CreateRecipeInput, createdBy: string) {
  const { ingredients, ...recipeData } = data;
  return prisma.recipe.create({
    data: {
      ...recipeData,
      createdBy,
      ingredients: { create: ingredients },
    },
    include: { ingredients: true },
  });
}

export async function getRecipe(id: string) {
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
}

// ── Recipe scaler ─────────────────────────────────────────────────────────────

export function scaleRecipe(
  recipe: { name: string; basePortions: number; ingredients: Array<{ ingredientName: string; amount: unknown; unit: string }> },
  targetPortions: number,
) {
  return {
    name: recipe.name,
    basePortions: recipe.basePortions,
    targetPortions,
    ingredients: recipe.ingredients.map(ing => ({
      ingredientName: ing.ingredientName,
      unit: ing.unit,
      amount: Math.round((Number(ing.amount) / recipe.basePortions) * targetPortions * 10) / 10,
    })),
  };
}

export async function getScaledRecipe(id: string, targetPortions: number) {
  const recipe = await getRecipe(id);
  if (!recipe) throw Object.assign(new Error('Recipe not found'), { statusCode: 404 });
  return scaleRecipe(recipe, targetPortions);
}
