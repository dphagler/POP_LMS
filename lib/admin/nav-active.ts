export function isActive(href: string, exact: boolean | undefined, currentPath: string): boolean {
  if (!href) {
    return false;
  }

  const normalizedCurrent = currentPath.endsWith("/") && currentPath !== "/" ? currentPath.slice(0, -1) : currentPath;
  const normalizedHref = href.endsWith("/") && href !== "/" ? href.slice(0, -1) : href;

  if (exact) {
    return normalizedCurrent === normalizedHref;
  }

  if (normalizedCurrent === normalizedHref) {
    return true;
  }

  return normalizedCurrent.startsWith(`${normalizedHref}/`);
}
