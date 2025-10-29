import { Link } from "react-router-dom";
import Button from "./Button";

export default function UnauthorizedPanel({ message }) {
  return (
    <div className="p-6 bg-slate-800 rounded-md border border-white/6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-rose-400">Not authorized</h2>
      <p className="mt-2 text-slate-300">
        {message || "You don't have permission to view this section."}
      </p>
      <div className="mt-4 flex gap-3">
        <Button as={Link} to="/admin/dashboard" variant="primary">
          Back to dashboard
        </Button>
        <Link to="/" className="text-slate-300 underline">
          Return to site
        </Link>
      </div>
    </div>
  );
}
