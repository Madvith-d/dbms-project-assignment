import { Role } from '@prisma/client';

export function publicUserFields(user: {
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

export function publicUserMini(user: {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}) {
  return {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  };
}
