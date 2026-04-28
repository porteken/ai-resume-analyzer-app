import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import About from "./page";

describe("about page component", () => {
  it("should render the main heading", () => {
    render(<About />);
    expect(screen.getByText("About AI Resume Analyzer")).toBeInTheDocument();
  });

  it("should render the app description", () => {
    render(<About />);
    expect(
      screen.getByText(/ai resume analyzer is a web application/i),
    ).toBeInTheDocument();
  });

  it("should render GitHub links", () => {
    render(<About />);
    const frontendLink = screen.getByRole("link", {
      name: /frontend app on github/i,
    });
    expect(frontendLink).toBeInTheDocument();
    expect(frontendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-app",
    );
    expect(frontendLink).toHaveAttribute("target", "_blank");
    expect(frontendLink).toHaveAttribute("rel", "noopener noreferrer");

    const backendLink = screen.getByRole("link", {
      name: /backend api on github/i,
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
    render(<About />);
    const emailLink = screen.getByText("porteken@gmail.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute("href", "mailto:porteken@gmail.com");
  });

  it("should render a back to home link", () => {
    render(<About />);

    const backLink = screen.getByRole("link", { name: /back to home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("should render project links and contact sections", () => {
    render(<About />);
    expect(screen.getByText("Project Links")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });
});
