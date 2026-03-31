/** Parse minimal `--key value` / `--flag` depuis process.argv. */
export function parseArgs(argv) {
  const args = {};
  const queue = argv.slice(2);

  while (queue.length > 0) {
    const a = queue.shift();
    if (!a) continue;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = queue[0];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        queue.shift();
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}
