const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// A JSON fájl relatív útvonala
const DATA_FILE = './bonds.json';

async function scrapeBonds() {
  console.log('Indul az állampapír adatok frissítése...');
  
  try {
    // 1. Jelenlegi adatok beolvasása
    const currentDataRaw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(currentDataRaw);

    // 2. Itt lehetne implementálni a valódi scraping logikát
    // Példa (kommentezve, mivel a pontos HTML struktúra változhat):
    /*
    const response = await axios.get('https://www.allampapir.hu/');
    const $ = cheerio.load(response.data);
    
    // pl. megkeressük a FixMÁP kamatát:
    const fixMapKamatString = $('.bond-card-fixmap .interest-rate').text();
    const parsedKamat = parseFloat(fixMapKamatString.replace('%', '').replace(',', '.'));
    
    // Frissítjük a JSON objektumban:
    const fixMap = data.series.find(b => b.id === 'fixmap_2029_q1');
    if(fixMap && !isNaN(parsedKamat)) {
        fixMap.fixedRate = parsedKamat;
    }
    */

    // Mivel a webscraping nagyon sérülékeny a design változásokra,
    // egyelőre csak a lastUpdated mezőt frissítjük az aktuális dátumra,
    // bemutatva a CI/CD folyamat működését.
    
    const today = new Date().toISOString().split('T')[0];
    
    // Ha volt tényleges módosítás a scraper által:
    let isChanged = true; // Ezt a scraper logika állítaná be
    
    if (isChanged) {
        data.lastUpdated = today;
        
        // 3. Fájl mentése
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`✅ Sikeres frissítés! Új dátum: ${today}`);
    } else {
        console.log('Nem volt változás a kamatokban.');
    }

  } catch (error) {
    console.error('Hiba történt a scraping során:', error);
    process.exit(1);
  }
}

scrapeBonds();
