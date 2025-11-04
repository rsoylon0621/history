const axios = require("axios");
const cron  = require("node-cron");

// your Firebase base (no .json suffix)
const FIREBASE_BASE_URL = process.env.FIREBASE_BASE_URL;

// crop → location map
const LOCATIONS = [
  { crop: "cabbage", lat: 6.75, lon: 125.35 }, // Kapatagan PH
  { crop: "radish",  lat: 7.09, lon: 125.49 }  // Tugbok Davao City
];

// helper: safe ISO date parts
function ymd(date) {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}
function hhmm(date) {
  return new Date(date).toISOString().substring(11, 16);
}

// ---------------- HISTORICAL IMPORT ----------------
async function fetchHistory(lat, lon, crop, startDate, endDate) {
  try {
    console.log(`📡 Historical import for ${crop} from ${startDate} → ${endDate}`);

    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
      `&start_date=${startDate}&end_date=${endDate}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia/Manila`;

    const res = await axios.get(url);
    const d = res.data.hourly;

    for (let i = 0; i < d.time.length; i++) {
      const [dateStr, timeStr] = d.time[i].split("T");
      const temp_c    = d.temperature_2m[i];
      const humidity  = d.relative_humidity_2m[i];
      const rain_chance = d.precipitation[i] > 0 ? 100 : 0;

      const path = `${FIREBASE_BASE_URL}/${crop}/weather_${dateStr}/${timeStr}.json`;
      await axios.put(path, { temp_c, humidity, rain_chance });

      console.log(`✅ ${crop} ${dateStr} ${timeStr} — Temp ${temp_c}°C, Hum ${humidity}%, Rain ${rain_chance}%`);
    }

    console.log(`✅ Historical upload complete for ${crop}!`);
  } catch (err) {
    if (err.response) console.error(`❌ ${crop} HTTP ${err.response.status}`, err.response.data);
    else console.error(`❌ ${crop} Error`, err.message);
  }
}

// ---------------- REAL‑TIME HOURLY UPDATES ----------------
async function fetchCurrent(lat, lon, crop) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=1&timezone=Asia/Manila`;

    const res = await axios.get(url);
    const d = res.data.hourly;
    const now = new Date();

    const dateStr = ymd(now);
    const hourStr = hhmm(now).substring(0, 5);
    const idx = d.time.findIndex(t => t.includes(hourStr.slice(0, 2)+":00"));

    if (idx === -1) {
      console.warn(`⚠️ ${crop} No forecast entry for ${hourStr}`);
      return;
    }

    const temp_c    = d.temperature_2m[idx];
    const humidity  = d.relative_humidity_2m[idx];
    const rain_chance = d.precipitation[idx] > 0 ? 100 : 0;

    const path = `${FIREBASE_BASE_URL}/${crop}/weather_${dateStr}/${hourStr}.json`;
    await axios.put(path, { temp_c, humidity, rain_chance });

    console.log(`🌤️ ${crop} live ${dateStr} ${hourStr} — Temp ${temp_c}°C, Hum ${humidity}%, Rain ${rain_chance}%`);
  } catch (err) {
    if (err.response) console.error(`❌ ${crop} HTTP ${err.response.status}`, err.response.data);
    else console.error(`❌ ${crop} Error`, err.message);
  }
}

async function runAllHistory() {
  const start = "2025-08-01";
  const end   = ymd(new Date());
  for (const { crop, lat, lon } of LOCATIONS) {
    await fetchHistory(lat, lon, crop, start, end);
  }
}

async function runRealtime() {
  for (const { crop, lat, lon } of LOCATIONS) {
    await fetchCurrent(lat, lon, crop);
  }
}

// ----------------------------------------------------------

(async () => {
  // first backfill everything
  await runAllHistory();

  // then start continuous hourly updates
  console.log("⏱ Starting continuous hourly updates…");
  cron.schedule("0 * * * *", runRealtime);
})();
