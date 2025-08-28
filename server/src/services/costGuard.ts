import { prisma } from '../prisma.js';
export async function canSpend(maxPerDay=3){ // $3/сутки по умолчанию
  const since = new Date(Date.now()-24*3600e3);
  const sum = await prisma.usage.aggregate({ _sum:{ costUsd:true }, where:{ createdAt:{ gte: since }}});
  return (sum._sum.costUsd||0) < maxPerDay;
}
