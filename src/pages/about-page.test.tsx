import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AboutPage } from "./about-page";

const renderAboutPage = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

describe("about page component", () => {
  it("should render the main heading", () => {
    renderAboutPage();
    expect(screen.getByText("About AI Resume Analyzer")).toBeInTheDocument();
  });

  it("should render the app description", () => {
    renderAboutPage();
    expect(
      screen.getByText(/ai resume analyzer is a web application/iu),
    ).toBeInTheDocument();
  });

  it("should render GitHub links", () => {
    renderAboutPage();
    const frontendLink = screen.getByRole("link", {
      name: /frontend app on github/iu,
    });
    expect(frontendLink).toBeInTheDocument();
    expect(frontendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-app",
    );
    expect(frontendLink).toHaveAttribute("target", "_blank");
    expect(frontendLink).toHaveAttribute("rel", "noopener noreferrer");

    const backendLink = screen.getByRole("link", {
      name: /backend api on github/iu,
    });
    expect(backendLink).toBeInTheDocument();
    expect(backendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-sam",
    );
    expect(backendLink).toHaveAttribute("target", "_blank");
    expect(backendLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should render contact email link", () => {
    renderAboutPage();
    const emailLink = screen.getByText("porteken@gmail.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute("href", "mailto:porteken@gmail.com");
  });

  it("should render a back to home link", () => {
    renderAboutPage();

    const backLink = screen.getByRole("link", { name: /back to home/iu });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });
});
