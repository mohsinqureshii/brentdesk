/**
 * Format a thrown value for a CLI's exit message.
 *
 * `err.message` alone is not enough. A driver error can carry an empty
 * message with everything useful in `code`/`errno`/`sqlState`/`sqlMessage`,
 * which is how a failed reset came to print "[reset]" and nothing else —
 * a failure report that says only that something failed.
 */
export function describeError(err: unknown): string {
  if (err === null || err === undefined) return "failed with no error value";

  if (typeof err !== "object") return String(err);

  const e = err as Record<string, any>;
  const parts: string[] = [];

  if (typeof e.message === "string" && e.message.trim()) parts.push(e.message.trim());
  if (typeof e.sqlMessage === "string" && e.sqlMessage.trim() && e.sqlMessage !== e.message) {
    parts.push(e.sqlMessage.trim());
  }

  const meta: string[] = [];
  for (const k of ["code", "errno", "sqlState", "fatal", "address", "port", "syscall"]) {
    if (e[k] !== undefined && e[k] !== null) meta.push(`${k}=${e[k]}`);
  }
  if (meta.length) parts.push(`(${meta.join(" ")})`);

  if (!parts.length) {
    // Nothing recognisable — show whatever it actually is rather than "".
    try {
      parts.push(JSON.stringify(err));
    } catch {
      parts.push(Object.prototype.toString.call(err));
    }
  }

  if (typeof e.stack === "string" && process.env.DEBUG_ERRORS === "1") {
    parts.push(`\n${e.stack}`);
  }
  return parts.join(" ");
}
