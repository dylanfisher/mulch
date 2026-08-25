import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/cn";

/** One thumb per value: a scalar is a list of one, and `undefined` is no answer at all. */
function toValues(value: number | readonly number[] | undefined): readonly number[] | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? [value] : value;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": label,
  ...props
}: SliderPrimitive.Root.Props) {
  // Base UI takes a scalar for a single-thumb slider and an array for a range, so a number
  // has to become a one-thumb list. With neither prop Base UI defaults to the scalar `min`,
  // so the fallback is one thumb too: [min, max] would render a second thumb with no value
  // behind it, and no aria-valuenow.
  const _values = toValues(value) ?? toValues(defaultValue) ?? [min];

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      aria-label={label}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-none bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            // The root is a `role="group"`: the control reached is the input inside the thumb.
            getAriaLabel={label === undefined ? null : () => label}
            className="relative block size-3 shrink-0 rounded-none border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden active:ring-1 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
