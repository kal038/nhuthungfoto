import { z } from 'zod/v4'

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})
