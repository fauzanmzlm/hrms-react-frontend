/** Only same-app paths are allowed, so a crafted link cannot redirect off-site. */
export function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}
