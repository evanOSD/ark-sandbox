# Refactoring `ProjectClient.tsx`

## Latar Belakang
File `ProjectClient.tsx` saat ini telah mencapai hampir 1000 baris kode. Kekhawatiran Anda sangat **tepat dan valid dari sudut pandang *software engineering***. File kode yang terlalu besar (biasa disebut *monolithic component*) dapat menyebabkan beberapa masalah:
1. **Tidak *Scalable***: Semakin banyak fitur yang ditambahkan, file akan semakin panjang dan sulit dikelola.
2. **Sulit Dibaca**: Developer baru (atau Anda sendiri di kemudian hari) akan kesulitan mencari bagian kode tertentu.
3. **Rawan Konflik (*Merge Conflict*)**: Jika ada beberapa *programmer* yang mengerjakan fitur berbeda di file yang sama, akan sangat rawan bentrok.

Solusi standarnya adalah memecah file besar tersebut menjadi komponen-komponen kecil yang masing-masing memiliki satu tanggung jawab utama (*Single Responsibility Principle*).

## Tujuan
Memecah `ProjectClient.tsx` menjadi beberapa komponen *functional* yang lebih kecil, memisahkan logika (*business logic* / *state*) dengan tampilan (*UI*), dan merangkainya kembali di `ProjectClient.tsx` murni sebagai layout (*container*).

---

## Rencana Struktur Direktori
Buat folder baru bernama `components` di dalam direktori `src/app/(dashboard)/projects/[projectId]/` untuk menyimpan komponen-komponen hasil pemisahan:

```text
src/app/(dashboard)/projects/[projectId]/
├── ProjectClient.tsx (Hanya sebagai Container/Layout Utama)
├── actions.ts
└── components/
    ├── VideoPlayer.tsx
    ├── NotesPanel.tsx
    ├── WorkspaceTabs.tsx
    ├── tabs/
    │   ├── DraftTab.tsx
    │   ├── KeyTermsTab.tsx
    │   ├── TranscribeTab.tsx
    │   ├── BackTranslateTab.tsx
    │   └── ConsultTab.tsx
    └── hooks/
        └── useProjectWorkspace.ts (Opsional: untuk state management)
```

---

## Langkah-langkah Refactoring (Task List)

### 1. Ekstraksi State Management & Logika
- [ ] Buat *custom hook* (misalnya `useProjectWorkspace.ts`) atau gunakan **React Context API** untuk memusatkan *state* yang digunakan oleh banyak komponen secara bersamaan (contoh: `activeScene`, `activeTab`, `isVideoPlaying`, referensi video/audio sinkronisasi).
- [ ] *Tujuan*: Mencegah kita mengoper terlalu banyak properti (*props drilling*) dari `ProjectClient.tsx` ke setiap anak komponennya.

### 2. Refactor Video Player & Kontrol (Kiri Atas)
- [ ] Buat file `components/VideoPlayer.tsx`.
- [ ] Pindahkan elemen `<video>`, logika referensi audio (`mneAudioRef`, `refAudioRef`), dan seluruh *Video Controls Bar* (tombol Play/Pause, Stop & Reset, dan Toggle M&E) ke dalam komponen ini.
- [ ] Pindahkan logika rumit pada `useEffect` yang bertugas untuk menyinkronkan pemutaran video dengan audio M&E dan audio referensi.

### 3. Refactor Notes/Comments Panel (Kiri Bawah)
- [ ] Buat file `components/NotesPanel.tsx`.
- [ ] Pindahkan UI daftar *notes*, formulir penambahan *note* di bagian bawah, serta *state* `notes` dan fungsi `handleAddNote` ke dalam komponen ini.

### 4. Refactor Navigasi Tab (Kanan Atas)
- [ ] Buat file `components/WorkspaceTabs.tsx`.
- [ ] Pindahkan deretan tombol navigasi utama ("Draft", "Key Terms", "Transcribe", "Back Translate", "Consult").
- [ ] Komponen ini hanya cukup menerima *prop* `activeTab` dan fungsi pengubahnya `setActiveTab`.

### 5. Refactor Konten Tab (Area Kerja Utama)
Buat folder `components/tabs/` dan siapkan komponen untuk masing-masing tab:
- [ ] **`DraftTab.tsx`**: Pindahkan blok kode yang menampilkan *list* loop teks, status rekaman, fungsi untuk memutar audio hasil (*Play Hasil*), dan fungsi *Approve/Reject*. Komponen ini akan butuh akses ke fungsi `handlePlayLoop` dan data `activeScene`.
- [ ] **`KeyTermsTab.tsx`**: Pindahkan tabel *Glosarium Kata Kunci (Key Terms)* dan logika pembacaan data `key_terms`.
- [ ] **`TranscribeTab.tsx`, `BackTranslateTab.tsx`, `ConsultTab.tsx`**: Pisahkan tampilan peringatan *placeholder* untuk tab evaluasi ke dalam masing-masing file agar kedepannya siap saat fitur ini diaktifkan.

### 6. Integrasi Terakhir di `ProjectClient.tsx`
- [ ] Setelah semua dipisah, bersihkan file `ProjectClient.tsx` sehingga fungsinya hanya memanggil dan menyusun grid *layout* untuk komponen-komponen baru di atas.
- [ ] Pastikan seluruh tipe data *TypeScript* (*interface*) didefinisikan secara rapi di file terpisah atau di komponen masing-masing.

---

## Catatan Tambahan untuk Implementator (Developer / AI)
- **PENTING: File Backup/Referensi.** Telah disediakan file *backup* di `src/app/(dashboard)/projects/[projectId]/ProjectClient copy.tsx`. File ini berisi kode asli sebelum *refactor*. Gunakan file ini sebagai pegangan utama (*source of truth*) untuk memastikan logika dan *state* tidak ada yang meleset.
- **Seluruh fungsionalitas HARUS diakomodasi 100% tanpa ada error atau fitur yang hilang.** Pastikan hasil *refactoring* sama persis fungsinya dengan versi *backup*.
- Lakukan refactoring secara bertahap, **tab demi tab**, atau komponen demi komponen untuk meminimalisasi *error*.
- Pastikan jalur (*path*) untuk setiap *import* komponen eksternal (seperti `lucide-react`, atau UI *components* `Button`, `Input`, `cn()`) diperbarui di setiap file.
- Jangan sampai memecah fitur (*regression*). Selalu lakukan pengetesan ulang (*sanity check*) terutama pada bagian sinkronisasi waktu video/audio dan fungsi perekaman setelah komponen dipisah.
