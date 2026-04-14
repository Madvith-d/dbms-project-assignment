import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';
import { clearAuthCookies, setAuthCookies, REFRESH, cookieOptions } from '../lib/authTokens';

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

export async function register(req: Request, res: Response) {
  try {
    const { email, password, first_name, last_name, phone } = req.body as {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        phone: phone ?? null,
        role: Role.member,
        status: 'active',
      },
    });

    setAuthCookies(res, {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    setAuthCookies(res, {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const token = req.cookies?.[REFRESH] as string | undefined;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET!
    ) as { user_id: number };

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
    });
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    };
    const accessOpts = {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    } as SignOptions;
    const access = jwt.sign(payload, process.env.JWT_SECRET!, accessOpts);
    res.cookie('access_token', access, cookieOptions());

    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  return res.json({ ok: true });
}

export async function updateMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body as {
      first_name?: string;
      last_name?: string;
      phone?: string | null;
      current_password?: string;
      new_password?: string;
    };

    const existing = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });
    if (!existing) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data: Record<string, unknown> = {};

    if (body.first_name !== undefined) data.first_name = body.first_name;
    if (body.last_name !== undefined) data.last_name = body.last_name;
    if (body.phone !== undefined) data.phone = body.phone ?? null;

    if (body.new_password) {
      if (!body.current_password) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const ok = await bcrypt.compare(body.current_password, existing.password_hash);
      if (!ok) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (body.new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      data.password_hash = await bcrypt.hash(body.new_password, 12);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data,
    });

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
