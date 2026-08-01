import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CostPanel } from "./CostPanel";
import type { CostEstimate } from "@/types/cost";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCostEstimate: CostEstimate = {
  totalMonthlyCost: 245.5,
  services: [
    {
      serviceId: "svc-1",
      serviceName: "EC2 Instance",
      serviceType: "ec2",
      monthlyCost: 150.0,
      available: true,
    },
    {
      serviceId: "svc-2",
      serviceName: "S3 Bucket",
      serviceType: "s3",
      monthlyCost: 95.5,
      available: true,
    },
    {
      serviceId: "svc-3",
      serviceName: "Custom Service",
      serviceType: "generic",
      monthlyCost: 0,
      available: false,
    },
  ],
  assumptions: {
    computeHoursPerMonth: 730,
    requestsPerMonth: 1_000_000,
    dataTransferGB: 100,
    storageGB: 50,
  },
};

describe("CostPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and fetches cost on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    // Should show loading state
    expect(screen.getByText("Calculating...")).toBeInTheDocument();

    // Should display total cost after fetch
    await waitFor(() => {
      expect(screen.getByText("$245.50")).toBeInTheDocument();
    });
  });

  it("displays per-service cost breakdown table", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("EC2 Instance")).toBeInTheDocument();
    });

    expect(screen.getByText("S3 Bucket")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$95.50")).toBeInTheDocument();
  });

  it("shows 'Estimate unavailable' for services without pricing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("Estimate unavailable")).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Retry cost estimation")).toBeInTheDocument();
  });

  it("validates parameter ranges and shows error for out-of-range values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("$245.50")).toBeInTheDocument();
    });

    // Find the requests input and set an invalid value (over max)
    const requestsInput = screen.getByLabelText("Requests per month");
    fireEvent.change(requestsInput, {
      target: { value: "99999999999" },
    });

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/Requests per month must be at most/)
      ).toBeInTheDocument();
    });
  });

  it("calls PUT /api/diagrams/[id]/cost on recalculate", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCostEstimate),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockCostEstimate,
            totalMonthlyCost: 500.0,
          }),
      });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("$245.50")).toBeInTheDocument();
    });

    // Click recalculate
    const recalcButton = screen.getByLabelText("Recalculate cost estimate");
    fireEvent.click(recalcButton);

    await waitFor(() => {
      expect(screen.getByText("$500.00")).toBeInTheDocument();
    });

    // Verify PUT was called
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/diagrams/test-diagram-1/cost",
      expect.objectContaining({
        method: "PUT",
        body: expect.any(String),
      })
    );
  });

  it("disables recalculate button during loading", async () => {
    // Never resolve to keep in loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<CostPanel diagramId="test-diagram-1" />);

    const recalcButton = screen.getByLabelText(
      "Recalculating cost estimate..."
    );
    expect(recalcButton).toBeDisabled();
  });

  it("disables recalculate button when validation errors exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("$245.50")).toBeInTheDocument();
    });

    // Set an invalid value to trigger validation error
    const storageInput = screen.getByLabelText("Storage");
    fireEvent.change(storageInput, {
      target: { value: "99999999999" },
    });

    await waitFor(() => {
      const recalcButton = screen.getByLabelText("Recalculate cost estimate");
      expect(recalcButton).toBeDisabled();
    });
  });

  it("renders parameter sliders for all three parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCostEstimate),
    });

    render(<CostPanel diagramId="test-diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText("$245.50")).toBeInTheDocument();
    });

    // Check all three parameter sliders exist
    expect(screen.getByLabelText("Requests per month slider")).toBeInTheDocument();
    expect(screen.getByLabelText("Data transfer slider")).toBeInTheDocument();
    expect(screen.getByLabelText("Storage slider")).toBeInTheDocument();
  });
});
