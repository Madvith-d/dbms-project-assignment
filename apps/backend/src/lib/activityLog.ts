import { ActivityAction, ActivityEntityType, Prisma } from '@prisma/client';
import prisma from './prisma';

type TxClient = Prisma.TransactionClient;

export interface ActivityLogInput {
  project_id: number;
  actor_user_id: number;
  entity_type: ActivityEntityType;
  entity_id: number;
  action: ActivityAction;
  summary: string;
  metadata?: Prisma.JsonValue;
}

export async function logActivity(
  input: ActivityLogInput,
  tx?: TxClient
) {
  const client = tx ?? prisma;
  await client.activityLog.create({
    data: {
      project_id: input.project_id,
      actor_user_id: input.actor_user_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}
