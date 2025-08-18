// src/main.tsx
import "./index.css";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// if you have these files:
import App from "./routes/App";
import Account from "./routes/Account";
import GuessWhat from "./routes/GuessWhat";
import Shorts from "./routes/Shorts";
import Pricing from "./routes/Pricing";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/account", element: <Account /> },
  { path: "/games/guess-what", element: <GuessWhat /> },
  { path: "/shorts", element: <Shorts /> },
  { path: "/pricing", element: <Pricing /> },
]);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
