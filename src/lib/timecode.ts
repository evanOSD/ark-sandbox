/**
 * Mengubah string timecode (seperti "01:30", "00:01:30", atau "00:01:30:15") menjadi milidetik (ms).
 * Mendukung format:
 * - MM:SS (misal "01:30" -> 90,000 ms)
 * - HH:MM:SS (misal "00:01:30" -> 90,000 ms)
 * - HH:MM:SS:FF atau HH:MM:SS;FF (30fps frame default, misal "00:01:30:15" -> 90,500 ms)
 * - Angka murni (dianggap detik atau milidetik tergantung nilai)
 */
export function parseTimecodeToMs(timecode: string): number {
  if (!timecode) return 0;
  
  const clean = timecode.trim();
  
  // Jika hanya angka murni
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean, 10);
    // Jika nilainya > 100000, kemungkinan besar sudah milidetik
    return val > 100000 ? val : val * 1000;
  }

  // Pisahkan berdasarkan titik dua atau titik koma (untuk drop-frame/non-drop frame)
  const parts = clean.split(/[:;]/);
  
  if (parts.length === 2) {
    // MM:SS
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return Math.round((mins * 60 + secs) * 1000);
  }
  
  if (parts.length === 3) {
    // HH:MM:SS
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return Math.round((hrs * 3600 + mins * 60 + secs) * 1000);
  }
  
  if (parts.length === 4) {
    // HH:MM:SS:FF (Frame default 30 fps)
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    const secs = parseInt(parts[2], 10) || 0;
    const frames = parseInt(parts[3], 10) || 0;
    
    const msFromFrames = Math.round(frames * (1000 / 30));
    return (hrs * 3600 + mins * 60 + secs) * 1000 + msFromFrames;
  }

  return 0;
}

/**
 * Format milidetik (ms) menjadi string timecode format HH:MM:SS.mmm atau MM:SS
 */
export function formatMsToTimecode(ms: number, includeMs = false): string {
  if (isNaN(ms) || ms < 0) return "00:00";
  
  const totalSeconds = Math.floor(ms / 1000);
  const remainingMs = ms % 1000;
  
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  const pad = (n: number) => String(n).padStart(2, "0");
  const padMs = (n: number) => String(n).padStart(3, "0");
  
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${includeMs ? `.${padMs(remainingMs)}` : ""}`;
  }
  
  return `${pad(mins)}:${pad(secs)}${includeMs ? `.${padMs(remainingMs)}` : ""}`;
}
