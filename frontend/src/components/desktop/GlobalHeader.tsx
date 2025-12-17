export function GlobalHeader() {
  return (
    <header className="bg-primary text-primary-foreground flex-shrink-0">
      <div className="px-6 py-5 flex items-center">
        {/* Left Side - Logo and Title */}
        <div className="flex items-center gap-4">
          <img
            src="/nps-logo.png"
            alt="NPS Logo"
            className="h-14 w-auto"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Converge @ NPS
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Naval Postgraduate School
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
