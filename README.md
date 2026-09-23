# Tijana & Milenko — Wedding Memories

Wedding web sajt za prikupljanje fotografija i video uspomena sa venčanja **Tijana & Milenko — 10.10.2026.**

## Sadržaj

- `index.html` — struktura sajta sa hero sekcijom, uputstvom, upload zonom i QR kodom.
- `styles.css` — responsive dizajn u beloj, beige i champagne gold paleti.
- `script.js` — drag & drop upload, validacija, status uploada i QR kod.

## Funkcije

- Drag & drop i pristupačan izbor fajlova tastaturom.
- Upload više fajlova, jedan po jedan.
- Podržani formati: JPG, JPEG, PNG, HEIC, MP4 i MOV.
- Maksimalna veličina originalnog fajla: **50 MB po fajlu**.
- Prikaz napretka po završenim fajlovima.
- Uspješno poslani fajlovi uklanjaju se iz reda, pa se pri ponovnom pokušaju ne šalju ponovo.
- Izbor i brisanje fajlova zaključani su dok upload traje.
- Automatski QR kod za URL stranice.
- Podrška za čitače ekrana, vidljiv fokus tastature i `prefers-reduced-motion`.

## Lokalno pokretanje

Pokrenite lokalni web server iz direktorijuma projekta, na primer:

```bash
python3 -m http.server 8080
```

Zatim otvorite `http://localhost:8080`.

## Google Drive integracija

Frontend šalje svaki fajl zasebno Google Apps Script Web App endpoint-u. Zahtjev je `text/plain` sa JSON sadržajem kako se ne bi aktivirao CORS preflight. JSON sadrži:

- `name` — naziv fajla;
- `type` — MIME tip ili `application/octet-stream`;
- `size` — veličinu originalnog fajla u bajtovima;
- `lastModified` — vrijeme posljednje izmjene;
- `uploadId` — jedinstveni identifikator pokušaja;
- `file` — Base64 sadržaj fajla.

Uspješan odgovor mora vratiti HTTP status `2xx` i JSON:

```json
{
  "success": true,
  "message": "File uploaded successfully"
}
```

U slučaju greške endpoint treba vratiti:

```json
{
  "success": false,
  "message": "Upload nije uspio. Pokušajte ponovo."
}
```

### Promjena upload endpoint-a

Endpoint se definiše prije učitavanja `script.js`:

```html
<script>
  window.WEDDING_UPLOAD_ENDPOINT = "https://your-endpoint.example/upload";
</script>
<script src="script.js"></script>
```

Ako globalna vrijednost nije postavljena, koristi se fallback URL iz `script.js`.

> **Napomena za 50 MB:** limit u interfejsu odnosi se na originalni fajl. Base64 uvećava tijelo zahtjeva za približno 33%, pa fajl od 50 MB proizvodi zahtjev od približno 66,7 MB prije malog JSON dodatka. Pouzdana podrška za maksimalne video fajlove zahtijeva backend sa direktnim ili dijeljenim/resumable uploadom; Apps Script Base64 tok treba obavezno testirati sa stvarnim nalogom i mobilnom mrežom prije događaja.

## Deploy

1. Postavite statičke fajlove na GitHub Pages ili drugi hosting.
2. Objavite Apps Script kao Web App koji vraća gore opisani JSON.
3. Postavite njegov `/exec` URL u `window.WEDDING_UPLOAD_ENDPOINT` u `index.html`.
4. Testirajte mali JPG, zatim veće fotografije i video na mobilnoj mreži.
5. Podijelite javni URL sajta gostima ili odštampajte QR kod.

## Privatnost i sigurnost

Apps Script endpoint je vidljiv svakome ko otvori sajt. To je očekivano za browser aplikaciju, ali `doPost(e)` mora na serveru provjeravati veličinu, tip i naziv fajla i imati zaštitu od automatizovane zloupotrebe. Nemojte stavljati privatne ključeve ili OAuth tokene u `index.html`, `script.js` ili drugi javno dostupan fajl.
