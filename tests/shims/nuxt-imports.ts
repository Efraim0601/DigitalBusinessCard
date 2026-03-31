export function useClipboard({ source }: { source?: string } = {}) {
  return {
    copy: (value?: string) => Promise.resolve(value ?? source ?? ""),
  };
}
