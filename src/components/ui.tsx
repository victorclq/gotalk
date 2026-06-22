import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`bg-surface border border-border rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-3xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "brand";
}) {
  const map: Record<string, string> = {
    neutral: "bg-surface-2 text-muted",
    green: "bg-positive/15 text-positive",
    amber: "bg-accent/15 text-accent",
    red: "bg-negative/15 text-negative",
    brand: "bg-brand/15 text-brand",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon = "✨",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-10 text-center">
      <div className="text-4xl mb-3 opacity-50">{icon}</div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-sm text-muted mt-1 max-w-md mx-auto">{description}</p>
    </Card>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong"
      : "bg-surface-2 text-foreground hover:bg-border";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${cls}`}
    >
      {children}
    </Link>
  );
}
