"use client";

export function BackButton() {
  return (
    <button
      type="button"
      className="baby-button-secondary mb-6 px-4 py-2 text-sm"
      onClick={() => window.history.back()}
    >
      ← Vorige pagina
    </button>
  );
}