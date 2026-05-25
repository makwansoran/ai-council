"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  intervalSeconds?: number;
}

export function AutoRefresh({ intervalSeconds = 20 }: Props) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, router]);
  return null;
}
