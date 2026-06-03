"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/productos");
  }, [router]);

  return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}