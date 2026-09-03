"use client";

import Link from "next/link";

export function BackButton() {
  return (
    <Link
      href="/"
      className="baby-button-secondary mb-6 px-4 py-2 text-sm"
    >
      ← Terug naar keuzemenu
    </Link>
  );
}