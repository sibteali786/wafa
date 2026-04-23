"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type DateTimePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

const DEFAULT_TIME = "09:00";

const TIME_OPTIONS = [
  { value: "06:00", label: "06:00 AM" },
  { value: "07:00", label: "07:00 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "21:00", label: "09:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

function toPkParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!year || !month || !day || !hour || !minute) {
    return null;
  }
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function toPkIso(date: string, time: string) {
  return `${date}T${time}:00+05:00`;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [timeDraft, setTimeDraft] = useState(DEFAULT_TIME);
  const parsed = value ? toPkParts(value) : null;
  const dateValue = parsed?.date ?? "";
  const timeValue = parsed?.time ?? timeDraft;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Due date</label>
        <Input
          type="date"
          value={dateValue}
          onChange={(event) => {
            const nextDate = event.target.value;
            if (!nextDate) {
              onChange(null);
              return;
            }
            onChange(toPkIso(nextDate, timeValue || DEFAULT_TIME));
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Time (PKT)</label>
        <select
          value={timeValue}
          onChange={(event) => {
            const nextTime = event.target.value;
            setTimeDraft(nextTime);
            if (!dateValue) {
              return;
            }
            onChange(toPkIso(dateValue, nextTime));
          }}
          className="h-10 w-full rounded-lg border border-line-strong bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
