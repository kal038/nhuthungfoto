import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ModuleMarkdownProps {
  content: string | null
}

export function ModuleMarkdown({ content }: ModuleMarkdownProps) {
  if (!content) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nội dung đang được cập nhật.
      </p>
    )
  }

  return (
    <div className="prose prose-zinc max-w-none prose-headings:font-heading prose-headings:text-zinc-900 prose-a:text-cta prose-img:rounded-lg">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
