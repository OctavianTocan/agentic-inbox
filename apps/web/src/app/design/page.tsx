import {
  BotIcon,
  BracesIcon,
  DatabaseIcon,
  FileTextIcon,
  LayersIcon,
  MessageSquareTextIcon,
  SparklesIcon
} from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/design-system/components/ui/card';
import { Input } from '@/design-system/components/ui/input';
import { Kbd, KbdGroup } from '@/design-system/components/ui/kbd';
import {
  Progress,
  ProgressLabel,
  ProgressValue
} from '@/design-system/components/ui/progress';
import { Separator } from '@/design-system/components/ui/separator';
import { Switch } from '@/design-system/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/design-system/components/ui/tabs';
import { Textarea } from '@/design-system/components/ui/textarea';

const surfaces = [
  ['apps/web', 'Next.js app, component showcase, AI chat UI'],
  ['apps/api', 'Effect v4 backend shell for API and AI workflows'],
  ['packages/api-core', 'Shared domain, schemas, and HttpApi contracts'],
  ['packages/clients/ai-sdk', 'Vercel AI SDK wrapped in Effect services']
];

const primitives = [
  'Buttons',
  'Badges',
  'Fields',
  'Cards',
  'Tabs',
  'Switches',
  'Progress',
  'AI thread parts'
];

export default function ComponentShowcase() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-8 lg:h-fit">
          <div className="space-y-4">
            <Badge className="w-fit gap-1.5" variant="outline">
              <SparklesIcon aria-hidden className="size-3" />
              AI app template
            </Badge>
            <div className="space-y-3">
              <h1 className="text-balance font-display text-4xl leading-none">
                Component system preview
              </h1>
              <p className="text-muted-foreground text-sm leading-6">
                The default dev route showcases the primitives, tokens, backend
                structure, and chat surfaces this template ships with.
              </p>
            </div>
          </div>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Project shape</CardTitle>
              <CardDescription>Effect API layout inspired.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {surfaces.map(([name, description]) => (
                <div className="space-y-1" key={name}>
                  <div className="font-medium text-sm">{name}</div>
                  <div className="text-muted-foreground text-xs leading-5">
                    {description}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayersIcon aria-hidden className="size-4" />
                  Design kit
                </CardTitle>
                <CardDescription>
                  Extracted tokens and primitives from effect-api-layout.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {primitives.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BotIcon aria-hidden className="size-4" />
                  AI stack
                </CardTitle>
                <CardDescription>
                  Frontend AI SDK path or backend Effect service path.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">Backend route</span>
                  <Switch defaultChecked />
                </div>
                <Progress value={72}>
                  <ProgressLabel>Starter readiness</ProgressLabel>
                  <ProgressValue />
                </Progress>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon aria-hidden className="size-4" />
                  Verification
                </CardTitle>
                <CardDescription>
                  Bun, Vitest, Biome, lefthook, and DESIGN.md linting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Run all checks</span>
                  <KbdGroup>
                    <Kbd>bun</Kbd>
                    <Kbd>run</Kbd>
                    <Kbd>ci</Kbd>
                  </KbdGroup>
                </div>
                <Separator />
                <div className="text-muted-foreground">
                  Pre-commit runs formatting, linting, and tests through
                  lefthook.
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader>
                <CardTitle>AI workflow composer</CardTitle>
                <CardDescription>
                  Field, input, textarea, and action styling in one compact
                  surface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input defaultValue="Cogram take-home evaluator" />
                <Textarea
                  defaultValue="Turn a messy transcript into a clean project brief with action items, risks, owners, and a follow-up plan."
                  rows={5}
                />
                <div className="flex flex-wrap gap-2">
                  <Button>
                    <MessageSquareTextIcon aria-hidden />
                    Draft response
                  </Button>
                  <Button variant="outline">
                    <FileTextIcon aria-hidden />
                    Save prompt
                  </Button>
                  <Button size="icon" variant="ghost">
                    <BracesIcon aria-label="Inspect schema" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streaming chat pattern</CardTitle>
                <CardDescription>
                  New content can stream without moving the reader away from
                  their place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="mb-2 font-medium">User</div>
                  <p className="text-muted-foreground">
                    Compare the notes and tell me what actually changed.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-sm shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">Assistant</span>
                    <Badge variant="outline">streaming</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    The important change is that the backend path is now an
                    Effect service around the AI SDK, while the frontend keeps
                    the richer chat primitives for the visible interaction.
                  </p>
                </div>
                <Button className="w-full" variant="secondary">
                  Jump to latest
                </Button>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Implementation modes</CardTitle>
              <CardDescription>
                The skill asks which AI path to use before committing the app
                structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="frontend">
                <TabsList>
                  <TabsTrigger value="frontend">Frontend AI SDK</TabsTrigger>
                  <TabsTrigger value="backend">Effect backend</TabsTrigger>
                  <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                </TabsList>
                <TabsContent className="pt-4" value="frontend">
                  Server actions or route handlers call the Vercel AI SDK from
                  the web app when a separate API process is unnecessary.
                </TabsContent>
                <TabsContent className="pt-4" value="backend">
                  `apps/api` owns the Effect runtime, HTTP API contracts, and
                  the `@clients/ai-sdk` wrapper.
                </TabsContent>
                <TabsContent className="pt-4" value="hybrid">
                  Start with the frontend path, then graduate stable workflows
                  into the backend without replacing the design system.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
