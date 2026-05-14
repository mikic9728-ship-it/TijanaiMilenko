# Tijana & Milenko — Wedding Memories

Moderan, luksuzno-minimalan wedding web sajt za prikupljanje fotografija i video uspomena sa venčanja **Tijana & Milenko — 10.10.2026.**

## Sadržaj

- `index.html` — struktura sajta sa hero sekcijom, uputstvom, upload zonom i QR kodom.
- `styles.css` — responsive luxury minimal dizajn u beloj, beige i champagne gold paleti.
- `script.js` — drag & drop upload, validacija fajlova, progress bar, potvrda upload-a i QR kod.

## Funkcije

- Drag & drop upload zona.
- Upload više fajlova odjednom.
- Podrška za slike i video zapise.
- Maksimalna veličina fajla: **50MB po fajlu**.
- Podržani formati:
  - Slike: `jpg`, `jpeg`, `png`, `heic`
  - Video: `mp4`, `mov`
- Progress bar tokom slanja.
- Poruka potvrde nakon uspešnog upload-a.
- Automatski QR kod za trenutni URL sajta.
- Google Drive integracija preko backend endpoint-a koji koristi `.env` podatke.

## Brzo pokretanje

Otvorite `index.html` direktno u browseru ili pokrenite lokalni server:

```bash
python3 -m http.server 8080
```

Zatim otvorite:

```text
http://localhost:8080
```

## Google Drive integracija preko `.env` podataka

Browser ne sme direktno da čita `.env` niti Google service account ključeve. Zbog toga ovaj frontend šalje fajlove na backend endpoint, podrazumevano:

```text
POST /api/upload
```

Backend treba da učita `.env` podatke, autentifikuje se na Google Drive i uploaduje fajlove u željeni folder.

### Primer `.env` vrednosti

```env
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
UPLOAD_ENDPOINT=/api/upload
MAX_FILE_SIZE_MB=50
```

### Očekivani backend endpoint

Frontend šalje `multipart/form-data` zahtev sa:

- `files` — jedan ili više fajlova.
- `eventName` — `Tijana & Milenko — Wedding Memories`.
- `eventDate` — `2026-10-10`.

Uspešan odgovor treba da vrati HTTP status `2xx`, na primer:

```json
{
  "message": "Files uploaded successfully"
}
```

U slučaju greške backend može vratiti:

```json
{
  "message": "Upload nije uspeo. Pokušajte ponovo."
}
```

### Promena upload endpoint-a

Ako backend nije na `/api/upload`, možete pre učitavanja `script.js` definisati globalnu vrednost:

```html
<script>
  window.WEDDING_UPLOAD_ENDPOINT = "https://your-domain.com/api/upload";
</script>
<script src="script.js"></script>
```

Alternativno, napravite endpoint `GET /api/config` koji vraća:

```json
{
  "uploadEndpoint": "https://your-domain.com/api/upload"
}
```

## Deploy napomene

1. Postavite statičke fajlove na hosting kao što su Netlify, Vercel, Cloudflare Pages ili bilo koji web server.
2. Dodajte backend/serverless funkciju za `POST /api/upload`.
3. U hosting dashboard-u unesite `.env` promenljive iz sekcije iznad.
4. Podelite javni URL sajta gostima ili odštampajte QR kod koji se prikazuje na stranici.

## Privatnost

Google Drive folder delite samo sa service account email adresom iz `.env` konfiguracije. Nemojte stavljati privatne ključeve u `index.html`, `script.js` ili bilo koji javno dostupan fajl.
