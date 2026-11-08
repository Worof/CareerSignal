import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FitCard } from "@/components/audience/fit-card";
import { EmptyState, Alert } from "@/components/ui/misc";
import { StatCard, TrendBadge } from "@/components/ui/stat-card";
import { Field, Input } from "@/components/ui/form-controls";
import { calculateAudienceFit } from "@/lib/calculations/audience-fit";
import { comparePeriods } from "@/lib/calculations/trends";

describe("TrendBadge", () => {
  it("shows a percentage change and an accessible description", () => {
    render(<TrendBadge cmp={comparePeriods(150, 100)} />);
    expect(screen.getByText("+50.0%")).toBeInTheDocument();
    expect(screen.getByText(/increase versus previous period/i)).toBeInTheDocument();
  });
  it("says there is no prior data instead of inventing a trend", () => {
    render(<TrendBadge cmp={comparePeriods(10, null)} />);
    expect(screen.getByText(/no prior period data/i)).toBeInTheDocument();
  });
  it("falls back to the absolute change when the previous value is zero", () => {
    render(<TrendBadge cmp={comparePeriods(10, 0)} />);
    expect(screen.getByText("+10")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renders unavailable values as an em dash, not zero", () => {
    render(<StatCard title="Profile views" value="—" explanation="Measured" />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("FitCard", () => {
  it("shows an insufficient-data state with no score when nothing is usable", () => {
    const result = calculateAudienceFit({ segments: [], targets: { job_title: ["A"], industry: [], company: [], seniority: [], location: [] } });
    render(<FitCard result={result} />);
    expect(screen.getByText("Insufficient data")).toBeInTheDocument();
    expect(screen.queryByText(/\/ 100/)).not.toBeInTheDocument();
  });
  it("labels low-confidence scores and always states the data limitation", () => {
    const result = calculateAudienceFit({
      segments: [{ dimension: "location", segment_name: "Cairo", percentage: 100, member_count: null }],
      targets: { job_title: ["A"], industry: [], company: [], seniority: [], location: ["Cairo"] },
    });
    render(<FitCard result={result} />);
    expect(screen.getByText("Low confidence")).toBeInTheDocument();
    expect(screen.getByText(/identifiable or available LinkedIn audience data/i)).toBeInTheDocument();
  });
  it("renders the empty prompt when there is no result at all", () => {
    render(<FitCard result={null} />);
    expect(screen.getByText(/import audience demographics/i)).toBeInTheDocument();
  });
});

describe("form + feedback primitives", () => {
  it("Field links its error message to the control via the label", () => {
    render(<Field id="x" label="Impressions" errors={["Must be 0 or more"]}><Input id="x" aria-invalid /></Field>);
    expect(screen.getByLabelText("Impressions")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Must be 0 or more");
  });
  it("EmptyState explains what to do next", () => {
    render(<EmptyState title="No data" description="Add some analytics." action={<button>Add</button>} />);
    expect(screen.getByRole("heading", { name: "No data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
  it("Alert uses role=alert only for errors", () => {
    const { rerender } = render(<Alert tone="error">Boom</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<Alert tone="info">FYI</Alert>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
