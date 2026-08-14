import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToast } from "../hooks/useToast";
import { ToastProvider } from "./ToastContext";

function ToastHarness() {
  const { showToast } = useToast();

  return (
    <button type="button" onClick={() => showToast("Cliente salvo.", "success")}>
      Mostrar toast
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes success toasts automatically", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /mostrar toast/i }));

    expect(screen.getByText("Cliente salvo.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText("Cliente salvo.")).not.toBeInTheDocument();
  });

  it("allows manual dismissal", async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /mostrar toast/i }));
    fireEvent.click(screen.getByRole("button", { name: /fechar mensagem/i }));

    expect(screen.queryByText("Cliente salvo.")).not.toBeInTheDocument();
  });
});
