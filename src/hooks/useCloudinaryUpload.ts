import { useState } from "react";
import { getCloudinaryConfig } from "@/app/(dashboard)/templates/actions";
import { saveRecording } from "@/app/(dashboard)/projects/[projectId]/loops/actions";
import { clearLocalRecording } from "@/lib/indexeddb";

interface UseCloudinaryUploadOptions {
  projectId: string;
  loopId: string;
}

export type UploadStep = "idle" | "config" | "cloudinary" | "database" | "cleanup" | "success" | "error";

export interface CloudinaryUpload {
  isUploading: boolean;
  uploadStep: UploadStep;
  handleUploadRecording: (blob: Blob | null) => Promise<void>;
}

/**
 * Handles the full Cloudinary upload flow:
 * 1. Fetch Cloudinary config from the server
 * 2. Request a signed upload URL
 * 3. Upload the WAV blob directly from the browser
 * 4. Save the resulting URL to the database
 * 5. Clear the local IndexedDB cache
 * 6. Redirect to the project page
 */
export function useCloudinaryUpload({
  projectId,
  loopId,
}: UseCloudinaryUploadOptions): CloudinaryUpload {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");

  const handleUploadRecording = async (blob: Blob | null) => {
    if (!blob) return;
    setIsUploading(true);
    setUploadStep("config");
    try {
      // 1. Dapatkan Cloudinary Config
      const config = await getCloudinaryConfig();
      if (!config.cloudName || !config.apiKey) {
        throw new Error(
          "Cloudinary API credentials are not configured on the server!",
        );
      }

      // 2. Minta Signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const uploadPreset = config.uploadPreset;
      const paramsToSign = {
        timestamp,
        upload_preset: uploadPreset,
      };

      const signatureRes = await fetch("/api/cloudinary-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
      });

      const signatureData = await signatureRes.json();
      if (signatureData.error) {
        throw new Error(
          "Gagal memperoleh tanda tangan Cloudinary: " + signatureData.error,
        );
      }

      setUploadStep("cloudinary");

      // 3. Upload direct ke Cloudinary dari browser
      const formData = new FormData();
      formData.append("file", blob, "recording.wav");
      formData.append("api_key", config.apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("upload_preset", uploadPreset);
      formData.append("signature", signatureData.signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error("Cloudinary Upload Error: " + uploadData.error.message);
      }

      const secureUrl = uploadData.secure_url;

      setUploadStep("database");

      // 4. Hubungkan ke database dengan menyimpan URL rekaman
      const recordFormData = new FormData();
      recordFormData.append("audio_url", secureUrl);
      await saveRecording(projectId, loopId, recordFormData);

      setUploadStep("cleanup");

      // 5. Hapus cache IndexedDB
      await clearLocalRecording(projectId, loopId);

      setUploadStep("success");

      alert(
        "Rekaman berhasil diunggah! Anda akan dialihkan kembali ke halaman proyek.",
      );
      window.location.href = `/projects/${projectId}`;
    } catch (err) {
      setUploadStep("error");
      alert(
        "Gagal mengunggah rekaman: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadStep, handleUploadRecording };
}
