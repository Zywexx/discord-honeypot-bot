# Discord Honeypot Bot 🍯🛡️
> **Geliştirici:** By Zywexx & 787 INC

Çalınan (compromised) Discord hesaplarının sunucularda spam, phishing veya reklam yaymasını engellemek için geliştirilmiş **otomatik güvenlik ve tuzak (honeypot) botu**.

---

## 📌 Temel Mantık ve Özellikler

1. **Honeypot Kanalı:** Sunucuda gerçek kullanıcıların yazmaması gereken bir tuzak kanal belirlenir. Bu kanala açılışta canlı bir uyarı ve mute sayacı mesajı sabitlenir.
2. **Anında Mesaj Temizliği:** Honeypot kanalına mesaj atan kullanıcının son **24 saatte** (veya `.env`'de belirlenen sürede) sunucudaki tüm erişilebilir kanallarda yazdığı mesajlar taranıp silinir (`bulkDelete` ve geriye doğru sayfalama desteğiyle).
3. **Rol Bazlı Süresiz Mute (Ban/Kick Yok):** Kullanıcı sunucudan atılmaz veya banlanmaz! Kullanıcı sunucuda kaldığı için bot ile arasında **"ortak sunucu" (mutual server)** ilişkisi devam eder ve kullanıcıya DM gönderilmesi her zaman garanti altına alınır.
4. **3 Yollu Kolay Doğrulama (Matematik Sorusu):**
   - **DM ile Doğrudan:** Kullanıcı bota DM kutusundan doğrudan sayıyı yazabilir (Örn: `11`).
   - **Etkileşimli Buton:** Botun DM bildirimindeki **"Cevapla"** butonuna basarak açılan modal penceresinden cevabını girebilir.
   - **Slash Komutu ile (`/verify`):** Kullanıcı doğrudan botun DM kutusunda veya sunucuda `/verify answer:11` komutunu çalıştırabilir. (Global komut ve BotDM context desteği entegre edilmiştir).
5. **Maksimum 3 Deneme:** Yanlış cevap verildiğinde kalan hak bildirilir. 3 deneme bittiğinde durum kilitlenir ve admin müdahalesi gerekir.
6. **Otomatik Mute Rolü Kurulumu (`/mute-rol-olustur`):** Tek komutla sunucuda mute rolünü oluşturur, tüm kanalların izinlerini kapatır ve ID'yi `.env` dosyasına otomatik yazar.
7. **Admin Müdahalesi:** `/unmute-manual @kullanici` komutu ile yetkililer mute durumunu tek tıkla kaldırabilir.
8. **Performanslı SQLite Veritabanı:** `better-sqlite3` ile WAL modunda senkron ve son derece hızlı çalışan tek dosyalık veritabanı (`data/honeypot.db`).

---

## 📂 Klasör Yapısı

```
hone-bot/
├── data/
│   └── honeypot.db              (better-sqlite3 dosyası, otomatik oluşur)
├── src/
│   ├── index.js                 (bot giriş noktası)
│   ├── deployCommands.js        (slash komutları Discord'a global ve DM uyumlu kaydeder)
│   ├── events/
│   │   ├── ready.js             (bot açılışı + honeypot kanalına uyarı mesajı kur/güncelle)
│   │   ├── messageCreate.js     (honeypot tetikleme mantığı)
│   │   ├── messageCreate.dm.js  (DM üzerinden doğrulama cevabı yakalama)
│   │   └── interactionCreate.js (slash komut, buton ve modal yönlendirme)
│   ├── commands/
│   │   ├── verify.js            (/verify komutu - Sunucu ve DM uyumlu)
│   │   ├── unmuteManual.js      (/unmute-manual admin komutu)
│   │   └── muteRolOlustur.js    (/mute-rol-olustur tek seferlik otomatik kurulum komutu)
│   ├── utils/
│   │   ├── db.js                (better-sqlite3 bağlantısı ve WAL pragma)
│   │   ├── initDb.js            (SQLite tabloları ve indeksler)
│   │   ├── store.js             (tüm veritabanı sorguları ve prepared statements)
│   │   ├── messageWiper.js      (son 24 saatlik mesajları sayfalayarak silme)
│   │   ├── verification.js      (soru üretimi ve merkezi cevap doğrulama)
│   │   ├── warningMessage.js    (honeypot kanalındaki canlı sayaçlı uyarı mesajı)
│   │   ├── ensureMutedRole.js   (mute rolü ve kanal izinleri yardımcı aracı)
│   │   └── logger.js            (log kanalına renkli embed gönderme)
│   └── config.js                (çevre değişkenleri okuma, doğrulama ve dinamik .env güncelleme)
├── .env.example
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Kurulum ve Ayarlar

### 1. Gereksinimler
- **Node.js**: v18.0.0 veya üzeri
- **Discord Bot Token** ve **Application ID**

### 2. Discord Developer Portal Ayarları
Botunuzun düzgün çalışabilmesi için [Discord Developer Portal](https://discord.com/developers/applications) üzerinden aşağıdaki izinlerin ve intent'lerin açık olması gerekir:

1. **Bot > Privileged Gateway Intents:**
   - ✅ **Message Content Intent** (Açık olmalı)
   - ✅ **Server Members Intent** (Açık olmalı)
2. **OAuth2 > URL Generator (Bot İzinleri):**
   - `Manage Roles` (Mute rolünü vermek, almak ve oluşturmak için)
   - `Manage Messages` (Mesajları silmek için)
   - `Read Message History` (Eski mesajları taramak için)
   - `View Channels`, `Send Messages`, `Embed Links`

> ⚠️ **ÖNEMLİ (Rol Hiyerarşisi):**
> Discord'da bir bot, yalnızca kendi en yüksek rolünden **daha alt sırada** olan rolleri verebilir veya alabilir.
> Sunucu Ayarları > Roller bölümünden botun rolünü **Susturuldu (Muted) Rolünün üzerine** taşıyınız!

---

### 3. Yapılandırma (`.env`)

`.env.example` dosyasını referans alarak `.env` dosyanızı doldurun:

```env
# Discord Bot Bilgileri
BOT_TOKEN=bot_tokeniniz
CLIENT_ID=botunuzun_application_id_degeri
GUILD_ID=sunucu_id_degeri

# Kanal ve Rol ID'leri
HONEYPOT_CHANNEL_ID=tuzak_kanal_id
LOG_CHANNEL_ID=log_kanali_id
MUTED_ROLE_ID=
EXEMPT_ROLE_IDS=muaf_rol_id1,muaf_rol_id2

# Operasyonel Ayarlar
MESSAGE_DELETE_WINDOW_HOURS=24
MAX_VERIFY_ATTEMPTS=3
```

*(Not: Eğer `MUTED_ROLE_ID` boş bırakılırsa, bot başlatıldıktan sonra sunucuda `/mute-rol-olustur` komutu çalıştırılarak otomatik oluşturulabilir ve `.env` dosyasına kaydedilir.)*

---

### 4. Bağımlılıkları Yükleme ve Komutları Kaydetme

```bash
# Bağımlılıkları yükleyin
npm install

# Slash komutlarını kaydedin (DM desteği için global olarak senkronize edilir)
npm run deploy
```

### 5. Botu Başlatma

```bash
npm start
```

---

## 🤖 Slash Komutları

| Komut | Parametre | Yetki | Çalışma Ortamı | Açıklama |
|---|---|---|---|---|
| `/verify` | `answer` (sayı) | Herkes | **DM & Sunucu** | Doğrulama sorusuna komut üzerinden cevap verir. DM kutusunda da görünür ve çalışır. |
| `/mute-rol-olustur` | Yok | Yönetici / Rolleri Yönet | **Sadece Sunucu** | **Tek seferlik:** Mute rolünü otomatik oluşturur, tüm kanalların yazma izinlerini kapatır ve ID'yi `.env`'ye kaydeder. `.env`'de rol tanımlıysa tekrar kullanılamaz. |
| `/unmute-manual` | `user` (@kullanıcı) | Rolleri Yönet / Admin | **Sadece Sunucu** | Doğrulama beklemeden kullanıcının susturmasını manuel olarak kaldırır. |

---

## 🔒 Güvenlik ve Kenar Durumlar (Edge Cases)

- **DM'de `/verify` Kullanımı:** Slash komutları global olarak ve `BotDM` ile `UserInstall/GuildInstall` context desteğiyle kaydedildiğinden, kullanıcılar botun DM penceresinde `/verify` komutunu doğrudan çağırabilir.
- **DM Kapalı Olan Kullanıcılar:** Bazı kullanıcılar sunucu üyelerinden gelen direkt mesajları kapatmış olabilir. Bu durumda bot hata vermez; durumu log kanalına `dm_failed` olarak işler. Kullanıcı sunucuda açık olan bir kanaldan `/verify` komutunu kullanarak doğrulamasını tamamlayabilir.
- **Yetki Eksikliği Olan Kanallar:** Botun erişiminin veya `Manage Messages` izninin olmadığı özel kategoriler/kanallar `try/catch` ile güvenli şekilde atlanır, akış kesilmez.
- **Çok Yoğun Kanallar (100 Mesaj Limiti):** `messageWiper.js`, Discord'un 100 mesajlık sınırına takılmaz; geriye doğru sayfalanarak son 24 saatlik tüm mesajları toplar ve `bulkDelete` ile temizler.
- **Uyarı Mesajının Silinmesi:** Honeypot kanalındaki uyarı mesajı silinirse bot bunu otomatik olarak algılar ve yeni bir mesaj oluşturup ID'sini günceller.
