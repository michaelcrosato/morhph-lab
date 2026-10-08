/** Workspace routing never guesses a second filename. */
export function workspaceURL(href, workspace) {
  if (!['review', 'workshop'].includes(workspace)) throw new Error('Unknown workspace.');
  const url = new URL(href);
  url.searchParams.delete('review');
  url.searchParams.delete('workshop');
  url.searchParams.set(workspace, '1');
  url.hash = '';
  return url.href;
}
export function requestedWorkspace(search, fallback = 'workshop') {
  const query = new URLSearchParams(search);
  if (query.has('workshop')) return 'workshop';
  if (query.has('review')) return 'review';
  return fallback === 'review' ? 'review' : 'workshop';
}
