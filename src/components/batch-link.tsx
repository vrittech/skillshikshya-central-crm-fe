import { Link } from "react-router-dom";

/** A batch name that opens the batch page. */
export function BatchLink({ id, name }: { id: number; name?: string | null }) {
  return (
    <Link to={`/batches/${id}`} className="hover:underline">
      {name ?? "—"}
    </Link>
  );
}
