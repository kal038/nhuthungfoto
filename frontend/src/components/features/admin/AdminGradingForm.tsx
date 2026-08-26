import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORY_KEYS, CATEGORY_LABELS, type CategoryScores } from '@/lib/grading'

export interface GradeFormValues {
  overallScore: number
  categoryScores: CategoryScores
  comment: string
}

export interface AdminGradingFormProps {
  onSubmit: (values: GradeFormValues) => void
  isPending?: boolean
  isError?: boolean
  className?: string
}

const DEFAULT_SCORE = 5

function ScoreSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-zinc-700">{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-zinc-900">
          {value} / 10
        </span>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        onValueChange={(values) => onChange(values[0])}
        aria-label={label}
      />
    </div>
  )
}

/**
 * Hùng's grading form — 1 overall + 5 category sliders (integer 1-10) and a
 * required written critique. Pure presentation: submission goes through
 * `onSubmit`; the caller owns the mutation.
 */
export function AdminGradingForm({
  onSubmit,
  isPending = false,
  isError = false,
  className,
}: AdminGradingFormProps) {
  const [overallScore, setOverallScore] = useState(DEFAULT_SCORE)
  const [categoryScores, setCategoryScores] = useState<CategoryScores>(
    Object.fromEntries(CATEGORY_KEYS.map((key) => [key, DEFAULT_SCORE])) as CategoryScores,
  )
  const [comment, setComment] = useState('')

  const commentValid = comment.trim().length > 0

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        if (!commentValid || isPending) return
        onSubmit({ overallScore, categoryScores, comment })
      }}
    >
      <div className="space-y-6">
        <ScoreSlider
          label="Điểm tổng kết"
          value={overallScore}
          onChange={setOverallScore}
          disabled={isPending}
        />

        <div className="space-y-4 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
          <h4 className="text-sm font-semibold text-zinc-900">Chi tiết tiêu chí</h4>
          {CATEGORY_KEYS.map((key) => (
            <ScoreSlider
              key={key}
              label={CATEGORY_LABELS[key]}
              value={categoryScores[key]}
              disabled={isPending}
              onChange={(value) =>
                setCategoryScores((prev) => ({ ...prev, [key]: value }))
              }
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hung-comments" className="text-sm font-medium text-zinc-700">
            Nhận xét của giảng viên
          </Label>
          <Textarea
            id="hung-comments"
            rows={6}
            placeholder="Nhận xét chi tiết cho học viên..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
          />
        </div>

        {isError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            Không gửi được đánh giá. Bài nộp có thể đã được chấm hoặc không còn ở
            trạng thái chờ.
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!commentValid || isPending}>
          {isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
        </Button>
      </div>
    </form>
  )
}
