# Issue: Sinkronisasi Visual Playhead dan Waveform Saat Record di Dalam Region

## Deskripsi Masalah

Saat ini, aplikasi memiliki fitur untuk memilih rentang waktu (Region) pada audio. Terdapat dua mode operasi pada region terpilih ini:
1. **Mode Playback (Play):** Ketika pengguna memutar audio di dalam region (misal: 15 detik terpilih), jarum playhead bergerak sangat mulus (*smooth*), tetap berada dalam batas region, dan berhenti secara presisi di akhir region (`region.end`). Hal ini karena internal `WaveSurfer.js` menggunakan `requestAnimationFrame` yang selaras dengan *refresh rate* layar saat melakukan pemutaran.
2. **Mode Recording (Record/Replace):** Ketika pengguna melakukan perekaman (replace) di dalam region yang sama, pergerakan playhead terasa kurang mulus (*stuttering* atau patah-patah), dan visualisasi *waveform* mungkin tidak merespons dengan cara yang sama persis seperti saat pemutaran. Saat ini, pergerakan playhead saat *record* kemungkinan dikendalikan oleh event `record-progress` yang di-trigger berdasarkan *buffer audio* yang masuk, bukan animasi visual yang mulus.

**Tujuan:**
Perilaku visual (pergerakan playhead dan tampilan waveform) saat **Recording** di dalam sebuah region harus **100% sama persis (identik)** dengan perilaku saat **Play** di dalam region tersebut.

---

## Analisis & Observasi Visual (Simulasi)

Jika Anda mencoba memilih rentang waktu 15 detik (misalnya detik ke 10 hingga 25):
- **Saat PLAY:** Playhead meluncur mulus dari detik 10, frame demi frame layar (60fps), hingga mencapai detik 25 dan berhenti seketika. Seluruh waveform (baik di dalam maupun di luar region) tetap terlihat jelas sebagai referensi posisi.
- **Saat RECORD:** Playhead mungkin melompat-lompat kecil mengikuti masuknya paket data audio (event `record-progress` dari plugin), atau tampilan region/waveform di luarnya terganggu/tertutup oleh waveform baru.

**Akar Masalah:**
Ketidaksesuaian *interpolation* dan mekanisme *update* visual. Mode Play menggunakan rendering internal WaveSurfer yang dioptimasi untuk animasi. Mode Record menggunakan *tick* sinkronisasi manual atau bawaan plugin rekaman yang bergantung pada I/O mikrofon, bukan *frame rate* monitor.

---

## Tahapan Implementasi (Untuk Junior Programmer / AI Model)

Berikut adalah panduan langkah demi langkah untuk menyelesaikan masalah ini. Harap kerjakan di dalam `useAudioEditorRecording.ts` (atau file terkait pengaturan visual `recWavesurfer`).

### Langkah 1: Pahami Mekanisme `requestAnimationFrame`
Jangan bergantung murni pada event `record-progress` bawaan `WaveSurfer.RecordPlugin` untuk menggerakkan *playhead* secara visual, karena event tersebut terikat pada performa pengolahan audio (seringkali lebih lambat dari 60fps).
- **Tugas:** Anda perlu membuat sebuah *custom animation loop* menggunakan `requestAnimationFrame` (RAF) ketika status *recording* aktif di dalam region.

### Langkah 2: Intersep Update Playhead Saat Record
Di dalam fungsi `startRecording` (berada di `useAudioEditorRecording.ts`), buat sebuah referensi (`useRef` atau variabel *state* internal hook) untuk menyimpan ID dari `requestAnimationFrame`.

1. Catat waktu mulai (*start time*) persis saat tombol record ditekan menggunakan `performance.now()`.
2. Mulai loop RAF:
   ```javascript
   let startTime = performance.now();
   let startPosition = selectedRegion.start;
   
   const updateVisual = () => {
     if (!isRecordingRef.current) return;
     
     // Hitung berapa detik telah berlalu secara presisi
     const elapsedSeconds = (performance.now() - startTime) / 1000;
     const currentPosition = startPosition + elapsedSeconds;
     
     // Set posisi playhead secara manual tapi dengan frame rate tinggi
     if (recWavesurfer.current) {
       recWavesurfer.current.setTime(currentPosition);
     }
     
     // Hentikan record jika sudah melewati batas akhir region
     if (currentPosition >= selectedRegion.end) {
       stopRecording(); // Panggil fungsi stop Anda
       return;
     }
     
     animationFrameId = requestAnimationFrame(updateVisual);
   };
   
   // Mulai loop animasi
   animationFrameId = requestAnimationFrame(updateVisual);
   ```

### Langkah 3: Nonaktifkan Auto-Scroll/Auto-Tick Bawaan RecordPlugin (Opsional)
Jika `RecordPlugin` dari WaveSurfer secara otomatis mencoba menggeser jarum playhead sendiri dan bertabrakan (konflik) dengan RAF yang kita buat, Anda harus mematikan fitur auto-update visual dari plugin tersebut (jika ada opsi konfigurasinya), ATAU pastikan RAF kita yang mengambil alih kontrol visual utama.

### Langkah 4: Pertahankan Visual Waveform Asli (Referential Context)
Pastikan bahwa saat merekam, *waveform* rekaman lama yang *tidak dipilih* tetap terlihat.
- Pada implementasi saat ini, saat `Replace`, kita mungkin menggunakan *layer* canvas yang berbeda atau plugin yang sama.
- **Validasi:** Pastikan `recWavesurfer` ditampilkan secara transparan di atas (atau digabung dengan) `refWavesurfer` (referensi audio asli), sehingga user tahu persis mereka sedang merekam menggantikan bagian mana, sementara sisa lagunya tetap terlihat di kiri dan kanan region.

### Langkah 5: Pengujian (Testing)
Setelah diimplementasikan, jalankan tes manual:
1. Load audio project.
2. Drag/buat sebuah Region (misal durasi 10 detik).
3. Klik tombol `Play Region`. Perhatikan kehalusan jarum playhead.
4. Kembalikan jarum ke awal.
5. Klik tombol `Record`. 
6. **Kriteria Lulus:** Jarum playhead saat Record **harus berjalan sehalus** saat Play, berhenti otomatis di ujung region, dan tidak ada elemen visual (seperti background atau rentang region) yang hilang selama proses rekaman berlangsung.

---
**Catatan untuk Developer:** Fokus pada `useAudioEditorRecording.ts` dan pastikan sinkronisasi *state* di-handle dengan rapi tanpa menimbulkan *memory leak* (jangan lupa `cancelAnimationFrame` pada saat unmount atau `stopRecording`).
