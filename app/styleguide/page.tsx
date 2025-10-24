"use client";

import { useState } from "react";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  syncDocumentTheme,
  type ThemeMode,
  useThemeMode
} from "@/components/layout/theme-provider";
import { PageContainer } from "@/components/layout/page-container";

type PaletteToken = {
  name: string;
  description?: string;
  className?: string;
  backgroundVar?: string;
  textVar?: string;
  borderVar?: string;
};

type PaletteSection = {
  title: string;
  description?: string;
  tokens: PaletteToken[];
};

const buttonVariants: NonNullable<ButtonProps["variant"]>[] = [
  "primary",
  "secondary",
  "accent",
  "outline",
  "ghost",
  "destructive"
];

const paletteSections: PaletteSection[] = [
  {
    title: "Core palette",
    description: "Primary brand colors inherited by most interactive elements.",
    tokens: [
      {
        name: "Primary",
        backgroundVar: "--color-primary",
        textVar: "--color-primary-content"
      },
      {
        name: "Secondary",
        backgroundVar: "--color-secondary",
        textVar: "--color-secondary-content"
      },
      {
        name: "Accent",
        backgroundVar: "--color-accent",
        textVar: "--color-accent-content"
      },
      {
        name: "Neutral",
        backgroundVar: "--color-neutral",
        textVar: "--color-neutral-content"
      }
    ]
  },
  {
    title: "Status tokens",
    description: "Semantic colors for alerts, badges, and progress indicators.",
    tokens: [
      {
        name: "Info",
        backgroundVar: "--color-info",
        textVar: "--color-info-content"
      },
      {
        name: "Success",
        backgroundVar: "--color-success",
        textVar: "--color-success-content"
      },
      {
        name: "Warning",
        backgroundVar: "--color-warning",
        textVar: "--color-warning-content"
      },
      {
        name: "Error",
        backgroundVar: "--color-error",
        textVar: "--color-error-content"
      }
    ]
  },
  {
    title: "Base surfaces",
    description: "Neutral layers used for backgrounds and elevated panels.",
    tokens: [
      {
        name: "Base-100",
        className: "bg-base-100 text-base-content border border-base-300"
      },
      {
        name: "Base-200",
        className: "bg-base-200 text-base-content border border-base-300"
      },
      {
        name: "Base-300",
        className: "bg-base-300 text-base-content border border-base-300"
      }
    ]
  },
  {
    title: "Application surfaces",
    description: "Custom CSS variables that shape POP specific elevations.",
    tokens: [
      {
        name: "App background",
        backgroundVar: "--app-background",
        textVar: "--text-primary",
        borderVar: "--surface-border"
      },
      {
        name: "Card surface",
        backgroundVar: "--surface-card",
        textVar: "--text-primary",
        borderVar: "--surface-border"
      },
      {
        name: "Muted surface",
        backgroundVar: "--surface-muted",
        textVar: "--text-muted-strong",
        borderVar: "--surface-border-strong"
      },
      {
        name: "Input surface",
        backgroundVar: "--surface-input",
        textVar: "--text-primary",
        borderVar: "--surface-border"
      }
    ]
  },
  {
    title: "Typography tokens",
    description: "Primary and secondary text colors for light and dark modes.",
    tokens: [
      {
        name: "Text primary",
        backgroundVar: "--surface-card",
        textVar: "--text-primary"
      },
      {
        name: "Text muted",
        backgroundVar: "--surface-card",
        textVar: "--text-muted"
      }
    ]
  },
  {
    title: "Focus + outline",
    description: "Utility tokens that power focus-visible outlines.",
    tokens: [
      {
        name: "Focus ring",
        backgroundVar: "--focus-ring",
        textVar: "--color-neutral-content"
      }
    ]
  }
];

const themeOptions = [
  { label: "POP", value: "pop", description: "Luminous light palette" },
  { label: "POP Dark", value: "pop-dark", description: "Moody, high-contrast dark palette" }
] as const;

type ThemeToggleValue = (typeof themeOptions)[number]["value"];

function ColorSwatch({ token }: { token: PaletteToken }) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 shadow-sm transition-colors",
        "border-base-300 bg-base-100/90 text-base-content",
        token.className
      )}
      style={{
        backgroundColor: token.backgroundVar ? `var(${token.backgroundVar})` : undefined,
        color: token.textVar ? `var(${token.textVar})` : undefined,
        borderColor: token.borderVar ? `var(${token.borderVar})` : undefined
      }}
    >
      <div className="space-y-1">
        <span className="text-sm font-semibold uppercase tracking-wide">{token.name}</span>
        {token.description ? (
          <span className="text-xs opacity-75">{token.description}</span>
        ) : null}
      </div>
      <div className="space-y-1 text-[0.7rem] font-mono opacity-80">
        {token.backgroundVar ? <div>bg: var({token.backgroundVar})</div> : null}
        {token.textVar ? <div>text: var({token.textVar})</div> : null}
        {token.className ? <div>class: {token.className}</div> : null}
      </div>
    </div>
  );
}

export default function StyleguidePage() {
  const { resolvedMode, setMode } = useThemeMode();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeTheme: ThemeToggleValue = resolvedMode === "dark" ? "pop-dark" : "pop";

  const handleThemeSelect = (value: ThemeToggleValue) => {
    const nextMode: ThemeMode = value === "pop-dark" ? "dark" : "light";
    syncDocumentTheme(nextMode, nextMode);
    setMode(nextMode);
  };

  return (
    <main className="py-12">
      <PageContainer className="flex flex-col gap-10">
        <header className="space-y-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemeSelect(option.value)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border px-5 py-3 text-left shadow-sm transition-all",
                  "border-base-300 bg-base-100/85 hover:-translate-y-0.5 hover:shadow-md",
                  activeTheme === option.value
                    ? "ring-2 ring-offset-2 ring-offset-base-100 ring-primary"
                    : ""
                )}
              >
                <span className="text-base font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold">POP UI styleguide</h1>
            <p className="text-base text-muted-foreground">
              Visual reference for the POP Initiative design tokens and daisyUI components. Toggle themes
              above to verify both the pop and pop-dark palettes.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-base-300 bg-base-100/80 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Color tokens</h2>
          <p className="text-sm text-muted-foreground">
            Theme tokens are powered by daisyUI. Each swatch reflects the active <code>data-theme</code> values
            and custom CSS variables that power POP surfaces.
          </p>
          <div className="mt-6 space-y-8">
            {paletteSections.map((section) => (
              <div key={section.title} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {section.title}
                  </p>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.tokens.map((token) => (
                    <ColorSwatch key={token.name} token={token} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-base-300 bg-base-100/80 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Cards</h2>
          <p className="text-sm text-muted-foreground">
            Card surfaces combine POP tokens with rounded corners and layered shadows.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card rounded-2xl border border-base-200 bg-base-100/95 shadow-md">
              <div className="card-body gap-3 p-6">
                <span className="badge badge-accent badge-sm w-fit uppercase tracking-wide">Featured</span>
                <h3 className="card-title text-lg">Design systems 101</h3>
                <p className="text-sm text-muted-foreground">
                  Explore how POP colors, typography, and spacing connect to craft cohesive experiences.
                </p>
                <div className="card-actions justify-end gap-2">
                  <Button size="sm" variant="ghost">
                    Preview
                  </Button>
                  <Button size="sm">Enroll</Button>
                </div>
              </div>
            </div>
            <div className="card rounded-2xl border border-dashed border-base-300 bg-base-200/70 shadow-inner">
              <div className="card-body gap-3 p-6">
                <h3 className="card-title text-lg">Empty state</h3>
                <p className="text-sm text-muted-foreground">
                  Softer neutrals and dashed outlines provide gentle affordances for adding new content.
                </p>
                <Button size="sm" variant="secondary" className="w-fit">
                  Create module
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Variants inherit the pop palette.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
              <Button disabled>Disabled</Button>
            </CardContent>
          </Card>

          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Form inputs</CardTitle>
              <CardDescription>Rounded surfaces and soft shadows for form elements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Text input" />
              <Select defaultValue="" aria-label="Example select">
                <option value="" disabled>
                  Choose a status
                </option>
                <option value="todo">To do</option>
                <option value="progress">In progress</option>
                <option value="done">Done</option>
              </Select>
              <Textarea rows={3} placeholder="Textarea" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
              <CardDescription>Triggers align with the pop theme tokens.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <p className="text-sm text-muted-foreground">
                    The pop theme focuses on high-contrast typography, luminous accents, and rounded surfaces.
                  </p>
                </TabsContent>
                <TabsContent value="details">
                  <p className="text-sm text-muted-foreground">
                    Components inherit tokens like primary, secondary, accent, success, warning, and error.
                  </p>
                </TabsContent>
                <TabsContent value="activity">
                  <p className="text-sm text-muted-foreground">
                    Theme toggles switch between the pop (light) and pop-dark (dark) palettes instantly.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>Utility accents for quick status cues.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Alerts surface contextual messaging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div role="alert" className="alert alert-info">
                <span className="font-medium">Heads up!</span>
                <span className="text-sm">This informational alert uses the info token.</span>
              </div>
              <div role="alert" className="alert alert-success">
                <span className="font-medium">Success</span>
                <span className="text-sm">Everything looks good and ready to go.</span>
              </div>
              <div role="alert" className="alert alert-warning">
                <span className="font-medium">Warning</span>
                <span className="text-sm">Take a second look before proceeding.</span>
              </div>
              <div role="alert" className="alert alert-error">
                <span className="font-medium">Error</span>
                <span className="text-sm">Action required to resolve the issue.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Progress bars adapt to semantic colors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <progress className="progress progress-primary" value={65} max={100} />
              <progress className="progress progress-secondary" value={40} max={100} />
              <progress className="progress progress-accent" value={85} max={100} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Table</CardTitle>
              <CardDescription>Striped rows keep data legible in both themes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-x-auto overflow-y-auto">
                <table className="table table-zebra">
                  <thead className="sticky top-0 z-10 bg-base-100">
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Alex Rivers</td>
                      <td>
                        <Badge className="badge-sm">Active</Badge>
                      </td>
                      <td>Designer</td>
                      <td>
                        <progress className="progress progress-primary w-24" value={80} max={100} />
                      </td>
                    </tr>
                    <tr>
                      <td>Jamie Cole</td>
                      <td>
                        <Badge variant="secondary" className="badge-sm">
                          Pending
                        </Badge>
                      </td>
                      <td>Engineer</td>
                      <td>
                        <progress className="progress progress-secondary w-24" value={55} max={100} />
                      </td>
                    </tr>
                    <tr>
                      <td>Sam Patel</td>
                      <td>
                        <Badge variant="outline" className="badge-sm">
                          Invited
                        </Badge>
                      </td>
                      <td>Product</td>
                      <td>
                        <progress className="progress progress-accent w-24" value={35} max={100} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-base-200 bg-base-100/85">
            <CardHeader>
              <CardTitle>Modal</CardTitle>
              <CardDescription>Dialogs inherit rounded corners and soft overlay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setIsModalOpen(true)}>Open modal</Button>
              <p className="text-sm text-muted-foreground">
                Click the button to preview the modal component with the current theme tokens.
              </p>
            </CardContent>
          </Card>
        </section>
      </PageContainer>

      <dialog className={cn("modal", isModalOpen ? "modal-open" : "")}>
        <div className="modal-box space-y-4">
          <h3 className="text-lg font-semibold">Modal title</h3>
          <p className="text-sm text-muted-foreground">
            This modal uses the same pop token stack as the rest of the interface. Check spacing, rounded
            corners, and typography against the spec.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsModalOpen(false)}>close</button>
        </form>
      </dialog>
    </main>
  );
}
