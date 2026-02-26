import { ThemeToggle } from "@/components/theme-toggle";

export default function ColorsPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-4">Design System Colors</h1>
          <p className="text-muted-foreground">
            A reference guide for the semantic color palette.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-8">
        {/* Primary Color */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Primary</h2>
          <div className="p-6 rounded-lg bg-primary text-primary-foreground border">
            <span className="font-bold">Primary Background</span>
            <p>Used for main actions, buttons, and active states.</p>
          </div>
        </section>

        {/* Secondary Color */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Secondary</h2>
          <div className="p-6 rounded-lg bg-secondary text-secondary-foreground border">
            <span className="font-bold">Secondary Background</span>
            <p>Used for less important actions or subtle emphasis.</p>
          </div>
        </section>

        {/* Muted Color */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Muted</h2>
          <div className="p-6 rounded-lg bg-muted text-muted-foreground border">
            <span className="font-bold">Muted Background</span>
            <p>Used for disabled states, backgrounds, or supplementary text.</p>
          </div>
        </section>

        {/* Accent Color */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Accent (Interactive/Hover States)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-lg bg-accent text-accent-foreground border">
              <span className="font-bold">Accent Background</span>
              <p>Base accent color.</p>
            </div>
            
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-2">Menu Example:</p>
              <div className="space-y-1">
                <div className="px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                  Regular Item (Hover me)
                </div>
                <div className="px-3 py-2 rounded-md text-sm bg-accent text-accent-foreground font-medium cursor-pointer">
                  Selected / Active Item
                </div>
                <div className="px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                  Another Item (Hover me)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Destructive Color */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Destructive</h2>
          <div className="p-6 rounded-lg bg-destructive text-destructive-foreground border">
            <span className="font-bold">Destructive Background</span>
            <p>Used for error states, delete actions, and warnings.</p>
          </div>
        </section>

        {/* UI Elements (Border, Input, Ring) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">UI Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <span className="font-bold">Card with Border</span>
              <p>This box has a defined border color.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Input Field</label>
              <input 
                type="text" 
                placeholder="Focus me to see the ring" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
