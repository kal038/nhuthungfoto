import { createFileRoute } from '@tanstack/react-router'
import { UserPortfolioPage } from '@/components/features/profile'

export const Route = createFileRoute('/gallery/$username')({
  component: GalleryPage,
})

function GalleryPage() {
  const { username } = Route.useParams()
  return <UserPortfolioPage username={username} />
}
