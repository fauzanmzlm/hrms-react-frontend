import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Returns a setter that patches URL search params, so filters and the page
 * number survive reloads and can be shared. Empty values remove the param,
 * and changing any filter goes back to page 1.
 */
export function useSearchParamState() {
  const [, setParams] = useSearchParams()
  return useCallback(
    (patch: Record<string, string>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          if (!('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
}
