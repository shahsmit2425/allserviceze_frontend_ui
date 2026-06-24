import { Input } from "./input";
import { Label } from "./label";

import { cn } from "@/lib/utils";

const calloutToneClasses = {
  default: {
    shell: "border-border/70 bg-muted/55",
    title: "text-foreground",
    body: "text-muted-foreground",
  },
  info: {
    shell: "border-sky-500/25 bg-sky-500/12",
    title: "text-sky-200",
    body: "text-sky-100/80",
  },
  success: {
    shell: "border-emerald-500/25 bg-emerald-500/12",
    title: "text-emerald-200",
    body: "text-emerald-100/80",
  },
  warning: {
    shell: "border-amber-400/30 bg-amber-500/12",
    title: "text-amber-200",
    body: "text-amber-100/80",
  },
};

function FormField({
  id,
  label,
  hint,
  icon: Icon,
  iconPosition = "center",
  className,
  labelClassName,
  inputClassName,
  containerClassName,
  children,
  ...props
}) {
  const iconClasses =
    iconPosition === "top"
      ? "left-4 top-4"
      : "left-4 top-1/2 -translate-y-1/2";

  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? <Label htmlFor={id} className={labelClassName}>{label}</Label> : null}
      <div className={cn("relative", containerClassName)}>
        {Icon ? (
          <Icon
            className={cn(
              "pointer-events-none absolute h-4 w-4 text-muted-foreground",
              iconClasses
            )}
          />
        ) : null}
        {children ? (
          children
        ) : (
          <Input id={id} className={cn(Icon ? "pl-11" : "", inputClassName)} {...props} />
        )}
      </div>
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FormCallout({ icon: Icon, title, tone = "default", className, children }) {
  const toneClasses = calloutToneClasses[tone] || calloutToneClasses.default;

  return (
    <div className={cn("rounded-[1.2rem] border px-4 py-3.5 shadow-sm shadow-slate-900/5", toneClasses.shell, className)}>
      <div className="flex items-start gap-3">
        {Icon ? <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneClasses.title)} /> : null}
        <div>
          {title ? <p className={cn("text-sm font-semibold", toneClasses.title)}>{title}</p> : null}
          <div className={cn("text-xs leading-5", toneClasses.body)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export { FormField, FormCallout }