"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export function NavigationProgress() {
  return (
    <ProgressBar
      height="2px"
      color="#d97757"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
