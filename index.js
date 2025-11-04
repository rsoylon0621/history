const axios = require("axios");

// set your Firebase Realtime Database (no .json at end)
const FIREBASE_BASE_URL = process.env.FIREBASE_BASE_URL;

// coordinates for Kapatagan, PH (near Digos)
const LAT = 6.75;
const LON = 125.35;
const START_DATE = "2025-08-01";
const END_DATE = "2025-10-13";

async function fetchOpenMeteoHistory() {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${START_DATE}&end_date=${END_DATE}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,relative_humidity_2m_min&timezone=Asia/Manila`;

    console.log("Fetching:", url);
    const res = await axios.get(url);

    const data = res.data;

    if (!data || !data.daily || !data.daily.time) {
      throw new Error("Invalid data from Open-Meteo");
    }

    const { time, temperature_2m_max, temperature_2m_min, relative_humidity_2m_max, relative_humidity_2m_min, precipitation_sum } = data.daily;

    for (let i = 0; i < time.length; i++) {
      const date = time[i];
      const avgTemp = (temperature_2m_max[i] + temperature_2m_min[i]) / 2;
      const avgHumidity = (relative_humidity_2m_max[i] + relative_humidity_2m_min[i]) / 2;
      const rainChance = precipitation_sum[i] > 0 ? 100 : 0;

      const path = `${FIREBASE_BASE_URL}/cabbage_weather_${date}/00:00.json`;

      await axios.put(path, {
        temp_c: avgTemp,
        humidity: avgHumidity,
        rain_chance: rainChance,
      });

      console.log(`✅ Uploaded ${date}: Temp ${avgTemp.toFixed(1)}°C, Hum ${avgHumidity.toFixed(0)}%, Rain ${rainChance}%`);
    }

    console.log("✅ Historical upload complete!");
  } catch (err) {
    if (err.response) {
      console.error(`❌ HTTP ${err.response.status}:`, err.response.data);
    } else {
      console.error("❌ Error:", err.message);
    }
  }
}

fetchOpenMeteoHistory();
