"use client";

import { useEffect } from "react";

export default function SuccessPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.opener) {
        // Send success message to parent window
        window.opener.postMessage(
          { type: "supabase-oauth-success" },
          window.location.origin
        );
      }
      // Close the popup window
      window.close();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
      <h1 className="text-xl font-semibold">Login Berhasil</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Menghubungkan kembali... Jendela ini akan tertutup otomatis.
      </p>
    </div>
  );
}
