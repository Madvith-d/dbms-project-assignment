import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';

function publicUser(user: {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: string;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function listUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { user_id: 'asc' },
    });
    return res.json({ users: users.map(publicUser) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await prisma.user.findUnique({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function updateUserRole(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { role } = req.body as { role: Role };

    const target = await prisma.user.findUnique({ where: { user_id: id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === Role.admin && role !== Role.admin) {
      const adminCount = await prisma.user.count({ where: { role: Role.admin } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin' });
      }
    }

    const user = await prisma.user.update({
      where: { user_id: id },
      data: { role },
    });

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { status } = req.body as { status: string };

    const target = await prisma.user.findUnique({ where: { user_id: id } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === Role.admin && status === 'inactive') {
      const adminCount = await prisma.user.count({
        where: { role: Role.admin, status: 'active' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the last active admin' });
      }
    }

    const user = await prisma.user.update({
      where: { user_id: id },
      data: { status },
    });

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
