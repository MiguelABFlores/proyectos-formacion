"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export function QrJoin({ code }: { code: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const base =
      process.env.NEXT_PUBLIC_PUBLIC_URL ?? `${window.location.protocol}//${window.location.host}`;
    setUrl(`${base}/play?code=${code}`);
  }, [code]);

  if (!url) return <div className="aspect-square w-48 bg-proyector-borde rounded-xl animate-pulse" />;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl shadow-lg">
        <QRCodeSVG value={url} size={192} level="M" />
      </div>
      <p className="text-xs text-proyector-textoSuave break-all max-w-[200px] text-center">{url}</p>
    </div>
  );
}
