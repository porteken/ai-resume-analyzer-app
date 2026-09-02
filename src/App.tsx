import { AboutPage } from "@/pages/about-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { Route, Routes } from "react-router";

import type { JSX } from "react";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route Component={HomePage} path="/" />
      <Route Component={AboutPage} path="/about" />
      <Route Component={NotFoundPage} path="*" />
    </Routes>
  );
}
