import { PanelRightIcon } from '@/design-system/components/icons';
import { Badge } from '@/design-system/components/ui/badge';
import { Button } from '@/design-system/components/ui/button';

const options = [
  {
    id: 'cradle',
    title: 'Button-first cradle v2',
    label: 'Recommended v2',
    className: 'cutout-demo--cradle',
    description:
      'Anchor the button first, then apply one continuous rim shadow to the combined cradle and cover shape.'
  },
  {
    id: 'mask',
    title: 'Masked geometry v2',
    label: 'Alpha-shadow',
    className: 'cutout-demo--mask',
    description:
      'Use a real alpha cutout and layered drop-shadow so the depth follows the visible carved edge.'
  },
  {
    id: 'scoop',
    title: 'Soft scoop v2',
    label: 'Favorite',
    className: 'cutout-demo--scoop',
    description:
      'Keep the gentler pill-shaped scoop, but move depth to the full composed shape so the lower rim stays connected.'
  },
  {
    id: 'flat',
    title: 'Quiet rim cutout v2',
    label: 'Subtlest shadow',
    className: 'cutout-demo--flat',
    description:
      'Keep the cutout quiet while still giving the carved boundary a complete low-contrast rim.'
  },
  {
    id: 'scoop-ring',
    title: 'Soft scoop + raised ring',
    label: 'On-top button',
    className: 'cutout-demo--scoop cutout-demo--raised-ring',
    description:
      'Keep the favorite scoop and surround the button with a circular panel-like ring that floats above the cutout.'
  },
  {
    id: 'mask-disc',
    title: 'Masked pocket + raised disc',
    label: 'Most explicit',
    className: 'cutout-demo--mask cutout-demo--raised-disc',
    description:
      'Pair the clean masked carve with a larger circular disc so the control reads as a button sitting on top.'
  }
];

function CutoutMockup({ className }: { readonly className: string }) {
  return (
    <div className={`cutout-demo-mockup ${className}`}>
      <div className="cutout-demo-sidebar">
        <div className="cutout-demo-dot" />
        <div className="cutout-demo-rail" />
        <div className="cutout-demo-rail cutout-demo-rail--short" />
      </div>
      <div className="cutout-demo-work">
        <div className="cutout-demo-list">
          <span />
          <span />
          <span />
        </div>
        <div className="cutout-demo-detail">
          <span />
          <span />
        </div>
      </div>
      <div aria-hidden className="cutout-demo-corner" />
      <div className="cutout-demo-button-shell">
        <Button
          aria-label="Show chat demo"
          className="cutout-demo-button"
          size="icon-sm"
          variant="ghost"
        >
          <PanelRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CutoutDemoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
        <div className="max-w-3xl space-y-3">
          <Badge className="w-fit" variant="outline">
            Cutout study
          </Badge>
          <div className="space-y-2">
            <h1 className="text-balance font-display text-4xl leading-none">
              Chat corner cutout options
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              Six v2 treatments for the collapsed chat control. Each mock keeps
              the button in the same row position and gives the cutout a
              complete shadow path so the comparison is about shape, not broken
              depth.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {options.map((option) => (
            <article
              className="rounded-xl border bg-card p-4 shadow-card-sm"
              key={option.id}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-semibold text-base">{option.title}</h2>
                  <p className="text-muted-foreground text-sm leading-6">
                    {option.description}
                  </p>
                </div>
                <Badge className="shrink-0" variant="secondary">
                  {option.label}
                </Badge>
              </div>
              <CutoutMockup className={option.className} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
