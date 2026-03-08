"use client";

import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      data-testid="theme-toggle"
      className="flex overflow-hidden rounded-md border border-gray-200 text-xs dark:border-gray-600"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          data-testid={`theme-option-${value}`}
          onClick={() => setTheme(value)}
          className={`px-2.5 py-1 transition-colors ${
            theme === value
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
