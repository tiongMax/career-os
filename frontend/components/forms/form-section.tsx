import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

export const inputClass =
  "w-full rounded-md border border-neutral-900 bg-white px-3 py-2 text-sm font-medium text-neutral-800 placeholder-shown:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-neutral-300 bg-white"
    >
      <div className="rounded-t-lg border-b border-neutral-100 bg-neutral-50 px-5 py-3">
        <h2
          id={headingId}
          className="text-xs font-medium uppercase tracking-wide text-neutral-500"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs font-normal normal-case tracking-normal text-neutral-500">
            {description}
          </p>
        )}
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  id,
  description,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  id?: string;
  description?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId.replace(/:/g, "")}`;
  const labelId = `${controlId}-label`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const childArray = Children.toArray(children);
  const onlyChild = childArray.length === 1 && isValidElement(childArray[0])
    ? (childArray[0] as ReactElement<Record<string, unknown>>)
    : null;
  const isDirectControl = onlyChild &&
    (typeof onlyChild.type !== "string" ||
      ["input", "select", "textarea", "button"].includes(onlyChild.type));
  const associatedControlId = isDirectControl
    ? (onlyChild.props.id as string | undefined) ?? controlId
    : undefined;
  const existingDescription = isDirectControl
    ? (onlyChild.props["aria-describedby"] as string | undefined)
    : undefined;
  const controlDescription = [existingDescription, describedBy].filter(Boolean).join(" ") || undefined;
  const enhancedChildren = isDirectControl
    ? cloneElement(onlyChild, {
        id: associatedControlId,
        ...(controlDescription ? { "aria-describedby": controlDescription } : {}),
        ...(error ? { "aria-invalid": true } : {}),
      })
    : children;

  return (
    <div>
      <label
        id={labelId}
        htmlFor={associatedControlId}
        className="mb-1.5 block text-sm font-medium text-neutral-700"
      >
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {isDirectControl ? (
        enhancedChildren
      ) : (
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
        >
          {enhancedChildren}
        </div>
      )}
      {description && (
        <p id={descriptionId} className="mt-1.5 text-xs text-neutral-500">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
