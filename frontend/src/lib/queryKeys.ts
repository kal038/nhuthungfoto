const adminKeys = {
  all: ['admin'] as const,
  access: () => [...adminKeys.all, 'access'] as const,
  queue: () => [...adminKeys.all, 'queue'] as const,
  submission: (id: string) => [...adminKeys.queue(), id] as const,
}

const creditKeys = {
  all: ['credits'] as const,
  balance: () => [...creditKeys.all, 'balance'] as const,
  histories: () => [...creditKeys.all, 'history'] as const,
  history: (pagination: { limit: number; offset: number }) =>
    [...creditKeys.histories(), pagination] as const,
}

const galleryKeys = {
  all: ['galleries'] as const,
  details: () => [...galleryKeys.all, 'detail'] as const,
  detail: (username: string) => [...galleryKeys.details(), username] as const,
}

const moduleKeys = {
  all: ['modules'] as const,
  lists: () => [...moduleKeys.all, 'list'] as const,
  details: () => [...moduleKeys.all, 'detail'] as const,
  detail: (slug: string) => [...moduleKeys.details(), slug] as const,
}

const paymentKeys = {
  all: ['payments'] as const,
  statuses: () => [...paymentKeys.all, 'status'] as const,
  status: (orderId: string | null) => [...paymentKeys.statuses(), orderId] as const,
}

const portfolioPhotoKeys = {
  all: ['portfolio-photos'] as const,
  lists: () => [...portfolioPhotoKeys.all, 'list'] as const,
}

const profileKeys = {
  all: ['profiles'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
}

const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  reviews: () => [...submissionKeys.all, 'review'] as const,
  review: (submissionId: string) => [...submissionKeys.reviews(), submissionId] as const,
}

/**
 * Central TanStack Query key factory.
 *
 * Each domain starts with an `all` key and builds more specific keys from that
 * prefix. This keeps exact cache reads type-safe while preserving prefix-based
 * invalidation for related queries.
 */
export const queryKeys = {
  admin: adminKeys,
  credits: creditKeys,
  galleries: galleryKeys,
  modules: moduleKeys,
  payments: paymentKeys,
  portfolioPhotos: portfolioPhotoKeys,
  profiles: profileKeys,
  submissions: submissionKeys,
} as const
