import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-grey">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <p className="body-lg text-text-secondary mt-sm mb-md">This page doesn't exist.</p>
        <button onClick={() => nav("/dashboard")} className="text-primary font-medium hover:underline">
          Go to dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
