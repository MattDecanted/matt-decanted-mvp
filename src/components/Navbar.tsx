// src/components/Navbar.tsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="flex gap-4 p-4 bg-gray-100 shadow-md">
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/signin">Sign In</Link>
      <Link to="/activate">Activate</Link>
      <Link to="/account">Account</Link>
      <Link to="/dashboard">Dashboard</Link> {/* new user dashboard link */}
    </nav>
  );
}
