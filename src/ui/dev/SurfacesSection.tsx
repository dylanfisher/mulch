/** @role Gallery section: card, badge, separator, tabs and kbd. */
import { YARD, yardLabel } from "@/lib/copy";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Kbd, KbdGroup } from "@/ui/components/kbd";
import { Separator } from "@/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { Specimen } from "@/ui/dev/Specimen";
import { SHORTCUTS } from "@/ui/shortcuts";

const BADGES = ["default", "secondary", "outline", "destructive"] as const;

const FX_TABS = [
  { value: "filter", label: "Filter", body: "Cutoff, resonance and drive." },
  { value: "delay", label: "Delay", body: "Time, feedback and wet mix." },
  { value: "reverb", label: "Reverb", body: "Size, damping and pre-delay." },
];

// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function SurfacesSection() {
  return (
    <>
      <Specimen name="Card">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{yardLabel("a")}</CardTitle>
            <CardDescription>vinyl-loop-03.wav · 124 BPM</CardDescription>
            <CardAction>
              <Badge variant="secondary">Armed</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="type-body text-muted-foreground">
            A panel groups one {YARD}&rsquo;s controls. Header, body and footer come from the
            primitive — never re-stack them by hand.
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              Load clip
            </Button>
          </CardFooter>
        </Card>
      </Specimen>

      <Specimen name="Badge">
        {BADGES.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </Specimen>

      <Specimen name="Separator" wide>
        <div className="flex w-full items-center gap-3 type-body text-muted-foreground">
          <span>{YARD}s</span>
          <Separator className="flex-1" />
          <span>Master</span>
        </div>
      </Specimen>

      <Specimen name="Keyboard shortcuts" wide>
        <dl className="grid w-full grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 type-body">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.action} className="contents">
              <dt>
                <KbdGroup>
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </dt>
              <dd className="text-muted-foreground">{shortcut.action}</dd>
            </div>
          ))}
        </dl>
      </Specimen>

      <Specimen name="Tabs" wide>
        <Tabs defaultValue="filter" className="w-full">
          <TabsList>
            {FX_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {FX_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="type-body text-muted-foreground"
            >
              {tab.body}
            </TabsContent>
          ))}
        </Tabs>
      </Specimen>
    </>
  );
}
