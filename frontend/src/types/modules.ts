export interface Module {
  id: number
  title: string
  slug: string
  description: string | null
  estimatedMinutes: number | null
  coverPhotoUrl: string | null
}

export interface ModuleDetail extends Module {
  contentMarkdown: string | null
  level: string | null
  track: string | null
  isFree: boolean | null
  isPublished: boolean | null
  examplePhotoUrls: string[]
  assignmentPrompt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ModuleListResponse {
  modules: Module[]
  currentModule: number
}
