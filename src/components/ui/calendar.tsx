"use client"

import * as React from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-background p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "font-mono text-sm",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute left-1 size-6 p-0",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "absolute right-1 size-6 p-0",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-8 font-mono text-[0.7rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "size-8 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "size-8 font-normal aria-selected:opacity-100",
        ),
        range_start: "bg-primary text-primary-foreground",
        range_middle: "bg-accent text-accent-foreground",
        range_end: "bg-primary text-primary-foreground",
        today: "border border-border",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <CaretLeftIcon className={cn("size-3.5", iconClassName)} {...iconProps} />
          ) : (
            <CaretRightIcon className={cn("size-3.5", iconClassName)} {...iconProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
