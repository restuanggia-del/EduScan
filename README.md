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
| Wablas | WhatsApp Gateway |
| Sonner | Notifikasi toast |
| Recharts | Grafik dashboard |
| html5-qrcode | Scanner QR Code |
| qrcode.react | Generate QR Code |

---

## 👥 Role & Akses
| Fitur | Kepala Sekolah | Tata Usaha | Guru Wali Kelas | Guru Biasa |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manajemen Kelas | ✅ | ✅ | ❌ | ❌ |
| Data Siswa | ✅ | ✅ | 👁️ Lihat saja (kelasnya sendiri) | ❌ |
| Data Guru | ✅ | ✅ | ❌ | ❌ |
| Generate QR | ✅ | ✅ | ❌ | ❌ |
| Scan Absensi | ✅ | ✅ | ✅ | ✅ |
| Rekap Absensi | ✅ | ✅ | ✅ (Rekap kelasnya sendiri) | ❌ |
| Pengaturan | ✅ | ✅ | ❌ | ❌ |

---

## 📱 Cara Penggunaan

1. **Register** akun Tata Usaha (TU) / Kepala Sekolah (KS) pertama
2. **Tambah Kelas** di menu Manajemen Kelas
3. **Tambah Siswa** di menu Data Siswa
4. **Tambah Guru** di menu Data Guru
5. **Generate QR** kartu siswa dan kartu guru di menu Generate QR
6. **Scan** kartu QR saat absensi di menu Scan Absensi
7. **Lihat rekap** kehadiran di menu Rekap Absensi
8. **Atur notifikasi** WhatsApp di menu Pengaturan

---

© 2026 EduScan v1.0
