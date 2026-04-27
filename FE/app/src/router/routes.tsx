import { createBrowserRouter } from "react-router-dom";

import { GestureControlPage } from "../pages/gesture-control/GestureControlPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <GestureControlPage />
  }
]);
