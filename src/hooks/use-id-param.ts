import { useParams } from 'react-router'

/** A positive integer route parameter, or undefined if it is malformed. */
export function useIdParam(name: string): number | undefined {
  const id = Number(useParams()[name])
  return Number.isInteger(id) && id > 0 ? id : undefined
}
