import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PhotoUploadContainer } from '@/components/features/upload'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

export const Route = createFileRoute('/upload')({
  component: UploadPage,
})

function UploadPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login' })
    }
  }, [loading, user])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 font-heading text-2xl font-bold text-primary">Tải ảnh lên</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Tải ảnh bài tập của bạn lên để nhận đánh giá từ AI hoặc giảng viên Nhựt Hùng.
        </p>

        <PhotoUploadContainer />
      </div>
    </div>
  )
}
