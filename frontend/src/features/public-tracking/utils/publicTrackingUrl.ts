export function getPublicTrackingPath(publicToken: string) {
  return `/track/${encodeURIComponent(publicToken)}`;
}

export function buildPublicTrackingUrl(
  publicToken: string,
  origin = window.location.origin
) {
  return new URL(getPublicTrackingPath(publicToken), origin).toString();
}
