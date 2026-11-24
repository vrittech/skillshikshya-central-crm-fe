/** A batch name. */
export function BatchLink({ name }: { id: number; name?: string | null }) {
  return <span>{name ?? "—"}</span>;
}
