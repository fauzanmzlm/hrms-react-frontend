import { useCurrentUser } from '@/features/auth/auth-context'

/** There is no endpoint to look up users, so other users are shown by id. */
export function UserLabel({ id }: { id: number | undefined }) {
  const me = useCurrentUser()
  if (id === undefined) return <span>—</span>
  return <span>{id === me.id ? 'You' : `User #${id}`}</span>
}
