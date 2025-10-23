import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const buttonVariants: NonNullable<ButtonProps["variant"]>[] = [
  "primary",
  "secondary",
  "accent",
  "outline",
  "ghost",
  "destructive"
];

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold">POP UI styleguide</h1>
        <p className="text-muted-foreground">
          Quick reference for our daisyUI-based components and the custom pop / pop-dark themes.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-base-300 bg-base-100/85">
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
          </CardContent>
        </Card>

        <Card className="border border-base-300 bg-base-100/85">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Form controls adopt rounded surfaces and soft shadows.</CardDescription>
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
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="border border-base-300 bg-base-100/85">
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Styled triggers align with pop theme tokens.</CardDescription>
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
                  The theme toggle switches between pop (light) and pop-dark instantly.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border border-base-300 bg-base-100/85">
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
    </main>
  );
}
