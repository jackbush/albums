/**
 * Rewrites the references in a manifest's text.
 *
 * Substitution on the source rather than an edit to the parsed module: a
 * commented-out frame is still a reference and has to be repointed as well, and
 * re-serialising a parsed manifest would drop every comment in the file. Only the quoted path is replaced, so
 * a caption that happens to mention a filename is left alone.
 */
export function rewrite(source, moves) {
  let text = source;
  for (const [from, to] of moves) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`(['"])${escaped}\\1`, 'g'), `$1${to}$1`);
  }
  return text;
}
