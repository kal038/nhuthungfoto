import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$username')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/gallery/$username', params })
  },
})
