import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});

const password = z.string().min(10, 'Use at least 10 characters.').max(200);

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  password,
  name: z.string().trim().min(1).max(120).optional(),
});

export const forgotSchema = z.object({ email: z.string().email('Enter a valid email.') });

export const resetSchema = z.object({ token: z.string().min(10), password });
