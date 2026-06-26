import React from "react";
import fs from "fs";
import path from "path";
import DocsClient from "./DocsClient";

export const metadata = {
  title: "Dokumentasi & Analisis Sistem ARK",
  description: "Portal Analisis Sistem, Persyaratan Teknis Lapangan, Kapasitas Penyimpanan, dan Simulasi Biaya Proyek ARK.",
};

export default function DocsPage() {
  let systemDocsText = "";
  let geminiChatText = "";

  try {
    const systemDocsPath = path.join(process.cwd(), "docs", "system-documentation.md");
    systemDocsText = fs.readFileSync(systemDocsPath, "utf8");
  } catch (error) {
    console.error("Gagal membaca file docs/system-documentation.md:", error);
    systemDocsText = `# Dokumentasi Sistem & Analisis Kebutuhan ARK
Gagal memuat dokumentasi sistem dari disk. Harap pastikan file docs/system-documentation.md tersedia di direktori proyek.`;
  }

  try {
    const geminiChatPath = path.join(process.cwd(), "percakapan-dengan-google-gemini.md");
    geminiChatText = fs.readFileSync(geminiChatPath, "utf8");
  } catch (error) {
    console.error("Gagal membaca file percakapan-dengan-google-gemini.md:", error);
    geminiChatText = `# Catatan Tanya Jawab Gemini
Gagal memuat catatan percakapan dengan Gemini dari disk. Harap pastikan file percakapan-dengan-google-gemini.md tersedia di direktori root proyek.`;
  }

  return <DocsClient systemDocsText={systemDocsText} geminiChatText={geminiChatText} />;
}
