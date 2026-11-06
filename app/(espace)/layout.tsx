"use client";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { VetShell } from "@/components/vet/Shell";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  // usePathname / useParams sont des données d'URL : Suspense requis (cacheComponents).
  return (
    <Suspense fallback={<PageLoader />}>
      <VetShell>{children}</VetShell>
    </Suspense>
  );
}
