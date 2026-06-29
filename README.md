# EduScan 📱

Sistem Absensi Sekolah Berbasis QR Code dengan Notifikasi WhatsApp Real-Time.

EduScan memudahkan pengelolaan absensi siswa menggunakan QR Code — guru cukup scan kartu siswa, sistem otomatis mencatat kehadiran dan mengirim notifikasi WhatsApp ke orang tua secara langsung.

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Kegunaan |
|---|---|
| React + TypeScript | Frontend |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Supabase | Database, Auth, Storage, Realtime |
| Fonnte | WhatsApp Gateway |
| Sonner | Notifikasi toast |
| Recharts | Grafik dashboard |
| html5-qrcode | Scanner QR Code |
| qrcode.react | Generate QR Code |

---

## 👥 Role & Akses

| Fitur | Kepala Sekolah | Tata Usaha | Guru Wali Kelas |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Manajemen Kelas | ✅ | ✅ | ❌ |
| Data Siswa | ✅ | ✅ | 👁️ Lihat saja |
| Data Guru | ✅ | ✅ | ❌ |
| Generate QR | ✅ | ✅ | ❌ |
| Scan Absensi | ✅ | ✅ | ✅ |
| Rekap Absensi | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ❌ | ❌ |

---

## 📱 Cara Penggunaan

1. **Register** akun Super Admin pertama
2. **Tambah Kelas** di menu Manajemen Kelas
3. **Tambah Siswa** di menu Data Siswa
4. **Generate QR** kartu siswa di menu Generate QR
5. **Scan** kartu QR saat absensi di menu Scan Absensi
6. **Lihat rekap** kehadiran di menu Rekap Absensi
7. **Atur notifikasi** WhatsApp di menu Pengaturan

---

## 📞 Notifikasi WhatsApp

EduScan menggunakan [Fonnte](https://fonnte.com) sebagai WhatsApp Gateway.

1. Daftar di fonnte.com
2. Hubungkan WhatsApp device
3. Copy API Token
4. Paste di **EduScan → Pengaturan → Tab WhatsApp**

---

© 2026 EduScan v1.0
