import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-grey p-md">
      <div className="text-center max-w-md">
        <div className="inline-flex h-12 w-12 rounded-md bg-insurer items-center justify-center mb-md">
          <Building2 className="h-6 w-6 text-insurer-foreground" />
        </div>
        <div className="num text-6xl font-bold text-insurer">404</div>
        <h1 className="h2 mt-sm">Page not found</h1>
        <p className="body text-text-secondary mt-1">The page you're looking for doesn't exist or has been moved.</p>
        <Button asChild className="mt-md bg-insurer hover:bg-insurer/90 text-insurer-foreground">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
