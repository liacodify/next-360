// hooks/useSignedUrlForKey.ts
"use client";
import { useEffect, useState } from "react";

export function useSignedUrlForKey(key: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setSignedUrl(null);
      return;
    }

    let active = true;
    fetch(`/api/s3/getSignedUrl?key=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setSignedUrl(data.url);
      })
      .catch(() => setSignedUrl(null));

    return () => {
      active = false;
    };
  }, [key]);

  return signedUrl;
}
