import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { AppViewport } from "@/components/wafa/app-viewport";
import { ScreenHeader } from "@/components/wafa/screen-header";

export default function LoginPage() {
  return (
    <AppViewport showTabBar={false}>
      <ScreenHeader
        title="Log in"
        left={
          <Link
            href="/"
            className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="size-5 stroke-[1.8]" />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pb-6 pt-4">
        <AuthForm mode="login" />
      </div>
    </AppViewport>
  );
}
