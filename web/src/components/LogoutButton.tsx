import { logoutAction } from "@/lib/auth-actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="baby-button-secondary px-4 py-2 text-sm">
        👋 Uitloggen
      </button>
    </form>
  );
}
