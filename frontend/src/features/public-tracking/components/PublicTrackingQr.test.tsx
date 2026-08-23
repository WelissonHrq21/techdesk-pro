import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicTrackingQr } from "./PublicTrackingQr";

type MockQrProps = {
  value: string;
  level?: string;
  marginSize?: number;
  title?: string;
  role?: string;
  "aria-label"?: string;
};

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    level,
    marginSize,
    title,
    role,
    "aria-label": ariaLabel,
  }: MockQrProps) => (
    <svg
      data-testid="qr-library-input"
      data-value={value}
      data-level={level}
      data-margin-size={marginSize}
      role={role}
      aria-label={ariaLabel}
    >
      <title>{title}</title>
    </svg>
  ),
}));

describe("PublicTrackingQr", () => {
  it("passes only the public URL to the QR library", () => {
    const publicToken = "33333333-3333-4333-8333-333333333333";
    const expectedUrl = `https://assistencia.example.com/track/${publicToken}`;

    render(
      <PublicTrackingQr
        publicToken={publicToken}
        origin="https://assistencia.example.com"
      />
    );

    const qr = screen.getByTestId("qr-library-input");
    expect(qr).toHaveAttribute("data-value", expectedUrl);
    expect(qr).toHaveAttribute("data-level", "M");
    expect(qr).toHaveAttribute("data-margin-size", "2");
    expect(qr.getAttribute("data-value")).not.toMatch(
      /document|customer|serviceOrderId|jwt|bearer/i
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", expectedUrl);
  });

  it("provides visible instructions, a textual URL and an accessible label", () => {
    render(
      <PublicTrackingQr
        publicToken="public-token"
        origin="http://localhost:8080"
      />
    );

    expect(screen.getByText("Acompanhe seu equipamento")).toBeInTheDocument();
    expect(screen.getByText(/escaneie para consultar/i)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /acompanhamento público/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent(
      "http://localhost:8080/track/public-token"
    );
  });
});
