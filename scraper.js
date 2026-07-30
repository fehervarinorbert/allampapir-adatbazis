const fs = require('fs');
const puppeteer = require('puppeteer');

const DATA_FILE = './bonds.json';

// Segédfüggvény a "5,50" -> 5.5 konverzióhoz
function parseRate(rateStr) {
  if (!rateStr) return null;
  const num = parseFloat(rateStr.replace(',', '.'));
  return isNaN(num) ? null : num;
}

async function scrapeBonds() {
  console.log('Indul az állampapír adatok frissítése Puppeteer segítségével...');
  
  let browser;
  try {
    // 1. Jelenlegi adatok beolvasása
    const currentDataRaw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(currentDataRaw);

    // 2. Böngésző indítása
    browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    console.log('Oldal megnyitása: allampapir.hu...');
    await page.goto('https://www.allampapir.hu/', { waitUntil: 'networkidle2' });
    
    // Várunk 2 másodpercet, hogy a React/Svelte komponensek és az animációk betöltődjenek
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. A teljes látható szöveg kinyerése a DOM-ból
    const text = await page.evaluate(() => document.body.innerText);
    
    // Felesleges sortörések és szóközök eltávolítása a könnyebb kereséshez
    const cleanText = text.replace(/\s+/g, ' ');
    
    let isChanged = false;

    // --- FixMÁP ---
    const fixMatch = cleanText.match(/Fix Magyar Állampapír.*?AKTUÁLIS KAMAT ([\d,]+) %/);
    if(fixMatch) {
        const rate = parseRate(fixMatch[1]);
        const fixMap = data.series.find(b => b.id === 'fixmap_2029_q1');
        if(fixMap && rate && fixMap.fixedRate !== rate) {
            console.log(`FixMÁP kamat frissítve: ${fixMap.fixedRate}% -> ${rate}%`);
            fixMap.fixedRate = rate;
            isChanged = true;
        }
    }

    // --- PMÁP ---
    const pmapMatch = cleanText.match(/Prémium Magyar Állampapír.*?AKTUÁLIS KAMAT ([\d,]+) %/);
    if(pmapMatch) {
        const rate = parseRate(pmapMatch[1]);
        const pmap = data.series.find(b => b.id === 'pmap_2036_i1');
        // A PMÁP esetén a kijelzett aktuális kamat az első éves kezdőkamat (baseRate + premium)
        if(pmap && rate && pmap.baseRate + pmap.inflationPremium !== rate) {
            console.log(`PMÁP teljes induló kamat frissítve: ${pmap.baseRate + pmap.inflationPremium}% -> ${rate}%`);
            // Mivel csak az induló kamatot látjuk, a baseRate-t frissítjük a prémiumot levonva
            pmap.baseRate = rate - pmap.inflationPremium;
            isChanged = true;
        }
    }

    // --- BMÁP ---
    const bmapMatch = cleanText.match(/Bónusz Magyar Állampapír.*?AKTUÁLIS KAMAT ([\d,]+) %/);
    if(bmapMatch) {
        const rate = parseRate(bmapMatch[1]);
        const bmap = data.series.find(b => b.id === 'bmap_2032_r1');
        if(bmap && rate && bmap.baseRate + bmap.marketPremium !== rate) {
            console.log(`BMÁP induló kamat frissítve: ${bmap.baseRate + bmap.marketPremium}% -> ${rate}%`);
            bmap.baseRate = rate - bmap.marketPremium;
            isChanged = true;
        }
    }
    
    // --- Babakötvény ---
    const babaMatch = cleanText.match(/Babakötvény.*?AKTUÁLIS KAMAT\s*(?:akár)?\s*([\d,]+)\s*%/);
    if(babaMatch) {
        const rate = parseRate(babaMatch[1]);
        const baba = data.series.find(b => b.id === 'babakotveny_2045_s');
        if(baba && rate && baba.baseRate + baba.inflationPremium !== rate) {
            console.log(`Babakötvény kamat frissítve: ${baba.baseRate + baba.inflationPremium}% -> ${rate}%`);
            baba.baseRate = rate - baba.inflationPremium;
            isChanged = true;
        }
    }

    // 4. Mentés
    const today = new Date().toISOString().split('T')[0];
    // Ha nem is volt kamatváltozás, a lastUpdated dátumot mindenképp frissítjük a biztonság kedvéért (vagy csak ha akarjuk)
    // Most állítsuk be mindig a mait, hogy látszódjon a CI/CD futás:
    if (data.lastUpdated !== today) {
        data.lastUpdated = today;
        isChanged = true;
    }
    
    if (isChanged) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`✅ Adatok sikeresen frissítve és elmentve! Új dátum: ${today}`);
    } else {
        console.log('✅ Nincs változás az adatokban, minden naprakész.');
    }

  } catch (error) {
    console.error('❌ Hiba történt a scraping során:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

scrapeBonds();
