import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Full-screen denial shown when a non-admin reaches an admin-gated page.
 * Gives a clear refusal plus a way back to the landing page.
 */
export function AdminAccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-bold text-zinc-900">Không có quyền truy cập</h1>
      <p className="text-sm text-muted-foreground">Trang này chỉ dành cho giảng viên.</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link to="/">Về trang chủ</Link>
      </Button>
    </div>
  )
}