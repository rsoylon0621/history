const axios = require("axios");

// Set your Firebase base (without .json)
const FIREBASE_BASE_URL = process.env.FIREBASE_BASE_URL;

// Coordinates
const LOCATIONS = [
  { name: "cabbage_weather", lat: 6.75, lon: 125.35 },        // Kapatagan, PH
  { name: "weather", lat: 7.09, lon: 125.49 }                 // Tugbok, Davao City
];

// Time window
const START_DATE = "2025-08-01";
const END_DATE   = "2025-10-13";

async function fetchAndUpload(location) {
  const { name, lat, lon } = location;
  try {
    // Hourly Open-Meteo archive endpoint
    const url =
      `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${lat}&longitude=${lon}` +
      `&start_date=${START_DATE}&end_date=${END_DATE}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia/Manila`;

    console.log(`📡 Fetching ${name} data: ${url}`);
    const res = await axios.get(url);
    const data = res.data;

    const hours = data?.hourly?.time;
    if (!hours) throw new Error("Invalid data structure from Open‑Meteo");

    const temps  = data.hourly.temperature_2m;
    const hums   = data.hourly.relative_humidity_2m;
    const rains  = data.hourly.precipitation;

    for (let i = 0; i < hours.length; i++) {
      const [dateStr, timeStr] = hours[i].split("T");     // e.g. 2025‑08‑01T00:00
      const hour = timeStr.substring(0, 5);               // 00:00, 01:00, ...
      const temp_c     = temps[i];
      const humidity   = hums[i];
      const rain_chance = rains[i] > 0 ? 100 : 0;

      const path = `${FIREBASE_BASE_URL}/${name}_${dateStr}/${hour}.json`;

      await axios.put(path, { temp_c, humidity, rain_chance });
      console.log(`✅ ${name} ${dateStr} ${hour} — Temp ${temp_c}°C, Hum ${humidity}%, Rain ${rain_chance}%`);
    }

    console.log(`✅ Completed upload for ${name}!`);
  } catch (err) {
    if (err.response)
      console.error(`❌ ${name} HTTP ${err.response.status}`, err.response.data);
    else
      console.error(`❌ ${name} Error:`, err.message);
  }
}

async function main() {
  for (const loc of LOCATIONS) {
    await fetchAndUpload(loc);
  }
  console.log("🎉 All locations done!");
}

main();
