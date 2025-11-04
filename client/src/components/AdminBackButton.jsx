import { useNavigate } from "react-router-dom";
import Button from "./Button";

export default function AdminBackButton({ label = "Back" }) {
  const navigate = useNavigate();
  return (
    <div className="mb-4">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        ← {label}
      </Button>
    </div>
  );
}
