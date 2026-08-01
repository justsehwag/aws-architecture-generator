import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateGallery } from "./TemplateGallery";

// Mock the useTemplates hook
vi.mock("@/hooks/useTemplates", () => ({
  useTemplates: vi.fn(),
}));

import { useTemplates } from "@/hooks/useTemplates";

const mockUseTemplates = vi.mocked(useTemplates);

const MOCK_TEMPLATES = [
  {
    templateId: "three-tier-web-app",
    name: "3-Tier Web Application",
    description:
      "A classic three-tier architecture with CloudFront CDN, ALB, and Aurora for managed relational database storage with read replicas.",
    category: "web-application" as const,
    useCases: [
      "E-commerce platforms requiring high availability",
      "Content management systems with separate layers",
      "Enterprise web portals with session management",
    ],
    isBuiltIn: true,
  },
  {
    templateId: "serverless-api",
    name: "Serverless API",
    description:
      "A fully serverless REST API built with API Gateway, Lambda functions, and DynamoDB for fast NoSQL data persistence.",
    category: "serverless" as const,
    useCases: [
      "Mobile app backends with unpredictable traffic",
      "Webhook processing and third-party integrations",
    ],
    isBuiltIn: true,
  },
  {
    templateId: "ai-chatbot",
    name: "AI Chatbot",
    description:
      "An AI-powered conversational interface using CloudFront, API Gateway, Lambda, Bedrock, and DynamoDB for conversation history.",
    category: "ai-ml" as const,
    useCases: [
      "Customer support chatbots with context-aware responses",
      "Internal knowledge base assistants",
    ],
    isBuiltIn: true,
  },
];

function createMockHookReturn(overrides = {}) {
  return {
    templates: MOCK_TEMPLATES,
    filteredTemplates: MOCK_TEMPLATES,
    isLoading: false,
    fetchError: null,
    loadStatus: "idle" as const,
    loadError: null,
    searchQuery: "",
    categoryFilter: null,
    setSearchQuery: vi.fn(),
    setCategoryFilter: vi.fn(),
    loadTemplate: vi.fn().mockResolvedValue("diagram-123"),
    resetLoadState: vi.fn(),
    getTemplateById: vi.fn((id: string) =>
      MOCK_TEMPLATES.find((t) => t.templateId === id)
    ),
    ...overrides,
  };
}

describe("TemplateGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTemplates.mockReturnValue(createMockHookReturn());
  });

  it("renders the search input", () => {
    render(<TemplateGallery />);
    expect(
      screen.getByLabelText("Search templates")
    ).toBeInTheDocument();
  });

  it("renders the category filter toolbar", () => {
    render(<TemplateGallery />);
    expect(
      screen.getByRole("toolbar", { name: /filter by category/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("renders template cards in a grid", () => {
    render(<TemplateGallery />);
    const list = screen.getByRole("list", { name: /available templates/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("displays template names on cards", () => {
    render(<TemplateGallery />);
    expect(screen.getByText("3-Tier Web Application")).toBeInTheDocument();
    expect(screen.getByText("Serverless API")).toBeInTheDocument();
    expect(screen.getByText("AI Chatbot")).toBeInTheDocument();
  });

  it("shows loading state when templates are being fetched", () => {
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({ isLoading: true, filteredTemplates: [] })
    );
    render(<TemplateGallery />);
    expect(screen.getByText("Loading templates…")).toBeInTheDocument();
  });

  it("shows empty state when no templates match filters", () => {
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({ filteredTemplates: [] })
    );
    render(<TemplateGallery />);
    expect(
      screen.getByText("No templates match your search.")
    ).toBeInTheDocument();
  });

  it("calls setSearchQuery when user types in search", async () => {
    const setSearchQuery = vi.fn();
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({ setSearchQuery })
    );
    render(<TemplateGallery />);
    const input = screen.getByLabelText("Search templates");
    await userEvent.type(input, "serverless");
    // Wait for debounce
    await waitFor(
      () => {
        expect(setSearchQuery).toHaveBeenCalledWith("serverless");
      },
      { timeout: 500 }
    );
  });

  it("calls setCategoryFilter when a category button is clicked", async () => {
    const setCategoryFilter = vi.fn();
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({ setCategoryFilter })
    );
    render(<TemplateGallery />);
    await userEvent.click(screen.getByRole("button", { name: "Serverless" }));
    expect(setCategoryFilter).toHaveBeenCalledWith("serverless");
  });

  it("shows template details when a card is clicked", async () => {
    render(<TemplateGallery />);
    const card = screen.getByRole("button", {
      name: /template: 3-tier web application/i,
    });
    await userEvent.click(card);
    // Expanded details should show full description and use cases
    expect(
      screen.getByRole("region", { name: /details for 3-tier web application/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Use Cases")).toBeInTheDocument();
    expect(
      screen.getByText("E-commerce platforms requiring high availability")
    ).toBeInTheDocument();
  });

  it("calls loadTemplate when Use Template button is clicked", async () => {
    const loadTemplate = vi.fn().mockResolvedValue("diagram-id-1");
    const onTemplateLoaded = vi.fn();
    mockUseTemplates.mockReturnValue(createMockHookReturn({ loadTemplate }));

    render(<TemplateGallery onTemplateLoaded={onTemplateLoaded} />);
    const useButtons = screen.getAllByRole("button", { name: /use .* template/i });
    await userEvent.click(useButtons[0]);

    await waitFor(() => {
      expect(loadTemplate).toHaveBeenCalledWith("three-tier-web-app");
    });
    await waitFor(() => {
      expect(onTemplateLoaded).toHaveBeenCalledWith("diagram-id-1");
    });
  });

  it("displays error alert when template load fails", () => {
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({
        loadStatus: "error",
        loadError: "Network connection failed",
      })
    );
    render(<TemplateGallery />);
    expect(
      screen.getByText("Failed to load template")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Network connection failed")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your current diagram remains unchanged.")
    ).toBeInTheDocument();
  });

  it("has proper accessibility structure", () => {
    render(<TemplateGallery />);
    expect(
      screen.getByRole("region", { name: /template gallery/i })
    ).toBeInTheDocument();
  });

  it("clears category filter when clicking active category", async () => {
    const setCategoryFilter = vi.fn();
    mockUseTemplates.mockReturnValue(
      createMockHookReturn({
        setCategoryFilter,
        categoryFilter: "serverless",
      })
    );
    render(<TemplateGallery />);
    await userEvent.click(screen.getByRole("button", { name: "Serverless" }));
    expect(setCategoryFilter).toHaveBeenCalledWith(null);
  });
});
