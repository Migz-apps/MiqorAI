import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pill } from "lucide-react";

const NotFound = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen grid place-items-center bg-background-grey p-md">
      <div className="text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-md bg-pharmacy flex items-center justify-center mb-md">
          <Pill className="h-6 w-6 text-pharmacy-foreground" />
        </div>
        <h1 className="h1 mb-2">Page not found</h1>
        <p className="body text-text-secondary mb-md"><code>{pathname}</code> doesn't exist in the pharmacy portal.</p>
        <Button asChild className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
};
export default NotFound;
