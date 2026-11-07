/** Strip inline markdown (backticks, emphasis) for plain-text contexts like breadcrumbs and search. */
export function plain(text: string): string {
  return text.replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|\W)[*_]([^*_]+)[*_](?=\W|$)/g, '$1$2');
}
