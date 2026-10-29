# Duka Mahiri

Programu ya Kiswahili ya kurekodi mauzo, stoo, matumizi na madeni ya duka, na kutoa taarifa za akili ya biashara (BI). Ni PWA: inasakinishwa kwenye simu na inafanya kazi **bila mtandao**. Data yote iko kwenye simu ya mwenye duka (IndexedDB); hakuna seva.

## Inafanya nini
- **Uza**: bidhaa kwa kubonyeza, kapu, taslimu/M-Pesa/Airtel/Tigo/Halotel/mkopo, uza haraka bila bidhaa (faida ni makadirio), tendua.
- **Kwa mwenye duka peke yake**: kitufe cha "Pokea taslimu" (gusa bidhaa, kisha gusa moja) na **Funga siku**: hesabu bidhaa jioni, mfumo unaandika mauzo yaliyokosekana (saa ya kuuza haijulikani).
- **Stoo**: kiasi, bei, gharama ya wastani, kuongeza stoo, marekebisho.
- **Madeni**: wateja, malipo (yanagawiwa deni kongwe kwanza), ukumbusho kwa WhatsApp/SMS, samehe.
- **Matumizi**: kwa aina na mwezi.
- **Ripoti**: kipindi chochote (leo hadi mwaka, maalum); mauzo na faida kwa saa/siku/wiki/mwezi/robo/mwaka na kuchimba kwa undani; bidhaa bora (ABC), aina, bidhaa zilizokwama, za kuagiza; saa na siku bora, ramani ya joto; mtiririko wa pesa; makadirio ya siku 7 na ushauri.
- **Nakala**: pakua JSON/CSV, rejesha, chapisha PDF.

## Weka mtandaoni
Vercel: ingiza repo, hakuna build (`vercel.json` ina mizizini (hakuna build)). Netlify: `netlify.toml` iko tayari.
Jaribu hapa: `npm run dev` kisha fungua http://localhost:8080.
Badilisha `VERSION` ndani ya `sw.js` kila unapobadilisha faili ili watumiaji wapate toleo jipya.

## Majaribio
`npm run test:gen && npm run test:verify`: hutengeneza data ya mfano, na hesabu huru ya Python hulinganishwa na injini ya BI.

## Tahadhari
- Hifadhi kwenye kivinjari inaweza kupotea simu ikifutwa au data ya tovuti ikisafishwa: **pakua nakala mara kwa mara**.
- Makadirio, ushauri na faida ya mauzo ya haraka ni makadirio, si ahadi.
- Data ya mfano si halisi; ifute kabla ya kuanza.
- Font: Inter (SIL OFL), leseni kwenye `fonts`.

## Muundo
`index.html`, `css/`, `js/`, `fonts/`, `icons/`, `sw.js`, `manifest.webmanifest` ziko mizizini; `tests/` na `tools/` ni za wasanidi.
Weka kwenye Vercel: Framework Preset = Other, Build/Output/Root Directory tupu.
