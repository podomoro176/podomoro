import prisma from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { CreateReviewInput } from './reviews.schema';

function scoreColor(score: number): 'green' | 'amber' | 'red' {
  if (score >= 4.5) return 'green';
  if (score >= 4.0) return 'amber';
  return 'red';
}

export async function getReviews(branchId?: string) {
  const where = branchId ? { branchId } : {};

  const branches = await prisma.branch.findMany({
    where: branchId ? { id: branchId } : {},
    select: { id: true, name: true },
  });

  const results = await Promise.all(
    branches.map(async (branch) => {
      const latest = await prisma.reviewScore.findFirst({
        where: { branchId: branch.id },
        orderBy: { createdAt: 'desc' },
      });

      const last30 = await prisma.reviewScore.findMany({
        where: { branchId: branch.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { score: true, reviewCount: true, source: true, createdAt: true },
      });

      return {
        branch,
        currentScore: latest ? Number(latest.score) : null,
        currentReviewCount: latest?.reviewCount ?? null,
        color: latest ? scoreColor(Number(latest.score)) : null,
        history: last30,
      };
    })
  );

  return results;
}

export async function createReview(data: CreateReviewInput) {
  const entry = await prisma.reviewScore.create({
    data: {
      branchId: data.branchId,
      score: data.score,
      reviewCount: data.reviewCount ?? 0,
      source: data.source,
      fetchedAt: new Date(),
    },
  });

  if (data.score < 4.0) {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
      const branch = await prisma.branch.findUnique({ where: { id: data.branchId }, select: { name: true } });
      sendMail(
        ownerEmail,
        `Score alert: ${branch?.name ?? data.branchId} heeft score ${data.score}`,
        `<p>Vestiging <strong>${branch?.name ?? data.branchId}</strong> heeft een score van <strong>${data.score}</strong> ontvangen (onder 4.0).</p>`,
      ).catch((err) => console.error('[reviews] alert email failed:', err.message));
    }
  }

  return { ...entry, score: Number(entry.score), color: scoreColor(data.score) };
}
