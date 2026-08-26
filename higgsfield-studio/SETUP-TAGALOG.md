# Paano patakbuhin ang Higgsfield Studio (Windows, step by step)

Para sa mga hindi pa sanay sa CMD. Sundan lang ang bawat step in order.

Mga command na `cd higgsfield-studio`, `npm install`, `npm run dev` — hindi sila
basta-basta ipapaste sa CMD kahit saan. Kailangan mo munang gawin ang Step 1 at
Step 2, kasi wala pa sa PC mo ang code at wala pang `npm`.

---

## Step 1 — I-install ang Node.js (isang beses lang)

Ang `npm` ay kasama ng Node.js. Kung wala kang Node, hindi makikilala ng CMD ang
`npm`.

1. Pumunta sa <https://nodejs.org>
2. I-download ang **LTS** version (yung nasa kaliwa, may nakasulat na "LTS")
3. I-run ang installer, **Next → Next → Install** lang, wala kang babaguhin
4. **Isara ang lahat ng CMD window** pagkatapos. Importante ito — hindi
   makikita ng lumang CMD window ang bagong install

Buksan ang bagong CMD at i-test:

```cmd
node -v
npm -v
```

Dapat may lumabas na tulad ng `v22.11.0` at `10.9.0`. Kung
`'node' is not recognized` ang lumabas, hindi tapos ang install o hindi mo
sinara ang CMD. I-restart ang PC at i-test ulit.

### Paano magbukas ng CMD

Pindutin ang **Windows key**, i-type ang `cmd`, tapos Enter.

---

## Step 2 — Kunin ang code sa PC mo

Piliin ang **isa** sa dalawa. Ang Paraan A ang pinakamadali kung ayaw mong
mag-install ng Git.

### Paraan A — Download ZIP (walang Git na kailangan)

1. Buksan: <https://github.com/aifrncnath-jpg/UGC/tree/add-higgsfield-studio>
2. Pindutin ang green na **Code** button → **Download ZIP**
3. Buksan ang Downloads folder, right click sa ZIP → **Extract All** → Extract
4. Makikita mo ang folder na `UGC-add-higgsfield-studio`
5. **Ilipat mo siya sa `C:\` para mas madali ang path.** I-drag mo lang sa
   This PC → Local Disk (C:)

Ngayon nasa `C:\UGC-add-higgsfield-studio\higgsfield-studio` ang app.

### Paraan B — Git clone

Kung may Git ka na (o i-install mo sa <https://git-scm.com>):

```cmd
cd C:\
git clone -b add-higgsfield-studio https://github.com/aifrncnath-jpg/UGC.git
```

Ngayon nasa `C:\UGC\higgsfield-studio` ang app.

---

## Step 3 — Pumunta sa tamang folder

Ito ang sagot sa "saan ko lalagay ang `cd higgsfield-studio`". Kailangan ka
munang lumipat sa folder na naglalaman niya.

Kung **Paraan A** ang ginawa mo:

```cmd
cd C:\UGC-add-higgsfield-studio\higgsfield-studio
```

Kung **Paraan B**:

```cmd
cd C:\UGC\higgsfield-studio
```

I-check kung tama ang folder:

```cmd
dir
```

Dapat may makita kang `package.json`, `app`, `lib`, `components`. Kung wala,
mali ang folder mo.

### Shortcut kung nahihirapan ka sa path

Buksan ang `higgsfield-studio` folder sa File Explorer. I-click ang address bar
sa taas, i-type ang `cmd`, tapos Enter. Magbubukas ang CMD na **nasa folder na
iyon agad** — pwede mo nang laktawan ang `cd`.

---

## Step 4 — I-install ang mga kailangan

```cmd
npm install
```

Aabot ito ng **2 hanggang 5 minuto** sa unang beses. Marami siyang idadownload.
Normal na may lumabas na dilaw na `warn` — hayaan mo lang. Basta walang
`ERR!`, ayos.

Isang beses lang ito. Hindi mo na kailangan gawin ulit sa susunod.

---

## Step 5 — Patakbuhin

```cmd
npm run dev
```

Hintayin mo ang ganito:

```
▲ Next.js 15.5.24
- Local:  http://localhost:3000
✓ Ready in 2.1s
```

Buksan ang browser mo, pumunta sa:

```
http://localhost:3000
```

**Huwag isara ang CMD window.** Habang bukas iyon, tumatakbo ang website. Pag
isinara mo, patay ang site.

Para ihinto: pindutin ang **Ctrl + C** sa CMD, tapos `Y` kung magtanong.

---

## Step 6 — I-connect ang Higgsfield account mo

1. Sa website, pindutin ang **Connect Higgsfield**
2. Ihahatid ka sa totoong login page ng Higgsfield
3. Mag-login gamit ang normal na account mo — **walang API key na kailangan**
4. Ibabalik ka sa app, konektado na

Isang beses lang din ito. Naka-save ang session mo sa `.data` folder.

---

## Sa susunod na gagamitin mo

Dalawang command lang:

```cmd
cd C:\UGC-add-higgsfield-studio\higgsfield-studio
npm run dev
```

Wala nang `npm install`, wala nang Connect. Diretso ka na.

---

## Kapag may problema

### `'npm' is not recognized as an internal or external command`

Hindi naka-install ang Node.js, o hindi mo sinara ang CMD pagkatapos
mag-install. Balik sa Step 1, tapos i-restart ang PC.

### `The system cannot find the path specified`

Mali ang path sa `cd`. Gamitin ang shortcut sa dulo ng Step 3 — i-type ang `cmd`
sa address bar ng File Explorer.

### `Error: Cannot find module` o `next: not found`

Hindi tumakbo o hindi natapos ang `npm install`. Patakbuhin ulit sa tamang
folder.

### `Port 3000 is already in use`

May gumagamit na ng port 3000. Gamitin ang iba:

```cmd
npx next dev -p 3005
```

Tapos buksan ang `http://localhost:3005`.

**Pero may importanteng detalye:** kung babaguhin mo ang port, kailangan mong
sabihin sa app. Gumawa ka ng file na pangalan ay `.env.local` sa loob ng
`higgsfield-studio` folder, tapos ilagay mo ito sa loob:

```
APP_URL=http://localhost:3005
```

Kung hindi mo ito gagawin, mabibigo ang Connect. Dahil galing sa `APP_URL` ang
OAuth redirect address, at kailangan tumugma iyon sa aktwal na binubuksan mo.

### Nag-error ang Connect na "state mismatch" o "redirect_uri"

Mali ang `APP_URL` mo. Kung nasa `localhost:3000` ka, wala kang kailangang
`.env.local`. Kung ibang port, tingnan ang taas.

### Blangko o loading forever ang page

Tingnan ang CMD window. Kung may pulang error doon, iyon ang tunay na problema.

---

## Paano gamitin

Simple lang siya, parang website ng Higgsfield:

1. **Pumili ng model** — tingnan mo ang slug, hindi ang pangalan (tingnan sa
   ibaba kung bakit)
2. **I-type ang prompt mo** — walang idadagdag ang app, exactly kung ano ang
   sinulat mo ang ipapadala
3. **Piliin ang ratio** — 9:16, 16:9, 4:3, 1:1, at iba pa. Naka-filter siya per
   model, kaya hindi mo mapipili ang hindi supported
4. **Resolution** — 1K, 2K, o 4K
5. **Ilan piraso** — 1 hanggang 3
6. **Reference image** (optional) — para sa character o product consistency
7. **Generate**

---

## MAHALAGA: tingnan ang slug, hindi ang pangalan

Magkaibang model talaga ang **Nano Banana Pro** at **Nano Banana 2**:

- **Nano Banana Pro** = Gemini 3 Pro Image. Mas magandang quality, mas magaling
  sa text sa loob ng image, mas mabagal, mga doble ang presyo.
- **Nano Banana 2** = Gemini 3.1 Flash. 2-3x bilis, mga kalahating presyo, at
  malapit na rin sa quality ng Pro sa karamihan ng shots.

Eto ang nakakalito: **baliktad ang slug sa pangalan sa Higgsfield.** Sa official
CLI docs mismo nila:

| Slug na ipapadala | Pangalan sa Higgsfield |
|---|---|
| `nano_banana_2` | Nano Banana **Pro** |
| `nano_banana_flash` | Nano Banana **2** |

Oo, `nano_banana_2` ang Pro. May logic naman: "flash" talaga ang Gemini 3.1 Flash
na Nano Banana 2. Pero sobrang dali malito.

Kaya sa app, **ang slug ang malaking nakalagay** sa bawat model card, tapos ang
pangalan at architecture ay maliit sa ilalim. Ang slug ang totoong ipinapadala at
binabayaran, kaya yun ang tingnan mo.

Kung may makita kang `nano_banana_pro` na hiwalay sa listahan, gamitin mo yun —
hindi ko siya pinagsama sa `nano_banana_2` para hindi ka mabayaran ng maling
model nang hindi mo alam.

---

## Reference images

Dalawang paraan:

1. **I-paste ang URL ng image** — palaging gumagana ito
2. **Mag-upload ng file** — gumagana lang kapag naka-deploy na online ang app

Bakit? Kasi sa **sariling server ng Higgsfield** kinukuha ang reference image.
Hindi nila kayang abutin ang `localhost` ng PC mo. Sinasabi ito ng app sa iyo
kapag na-detect niya, hindi siya tahimik na mabibigo.

Kung nasa localhost ka pa: mag-upload muna sa kahit saan (Imgur, Google Drive
public link, kahit ano) tapos i-paste mo ang URL.

Iba-iba rin ang max reference per model — 14 sa `nano_banana_2`, 8 sa
`gpt_image_2`, 1 lang sa Soul V2. Awtomatikong nag-a-adjust ang app.

Naka-save lahat sa **Gallery** tab, kasama ang eksaktong settings na ginamit.
Pwede mong pindutin ang **Reuse** para ibalik ang prompt at settings.

---

## Isang bagay na dapat mong malaman

**Kumakain ng credits.** Kahit Unlimited plan ka sa Higgsfield, ang lahat ng
dumadaan sa MCP ay nagbabawas ng credits sa standard rates. Ang Unlimited at
free generations ay sa higgsfield.ai lang applicable. Hindi ito bug — ganun ang
patakaran ng Higgsfield sa MCP.

Kaya naka-limit sa 3 ang piraso. Kung 3 ang pipiliin mo, 3x ang bayad.

---

## Kung may mali sa app

Buksan mo ang **Inspector** tab. Doon nakalagay ang totoong schema na binibigay
ng Higgsfield — kung anong fields at anong models talaga ang tinatanggap nila.

May **Copy raw schema** button doon. Pindutin mo lang at ipadala mo sa akin ang
na-copy, tapos maaayos ko agad kung may hindi tugma.

Sabihan mo lang ako kung gusto mong i-deploy natin online, para ma-access mo rin
sa phone at gumana ang reference images.
