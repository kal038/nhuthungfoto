export interface GalleryProfile {
  id: string
  username: string
  avatar_url: string | null
  skill_level: string | null
}

export interface GallerySubmission {
  id: string
  moduleId: string | null
  status: string
  reviewType: string | null
  createdAt: string
  originalPhotoUrl: string | null
  processedPhotoUrl: string | null
}

export interface GalleryData {
  profile: GalleryProfile
  submissions: GallerySubmission[]
}
