const axios = require("axios");

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const FIREBASE_BASE_URL = process.env.FIREBASE_BASE_URL;

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchAndUpload(startDate, endDate) {
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = formatDate(current);
    const url = `https://api.weatherapi.com/v1/history.json?key=${WEATHER_API_KEY}&q=Kapatagan,PH&dt=${dateStr}`;

    try {
      const res = await axios.get(url);
      const data = res.data.forecast.forecastday[0].day;
      const avgTemp = data.avgtemp_c;
      const avgHumidity = data.avghumidity;
      const rainChance = data.daily_chance_of_rain || (data.totalprecip_mm > 0 ? 100 : 0);

      const path = `${FIREBASE_BASE_URL}/cabbage_weather_${dateStr}/00:00.json`;
      await axios.put(path, { temp_c: avgTemp, humidity: avgHumidity, rain_chance: rainChance });

      console.log(`✅ Uploaded ${dateStr} → Temp ${avgTemp}°C, Hum ${avgHumidity}%, Rain ${rainChance}%`);
    } catch (err) {
      console.error(`❌ Error on ${dateStr}: ${err.message}`);
    }

    current.setDate(current.getDate() + 1);
  }

  console.log("✅ Historical import complete!");
}

fetchAndUpload(new Date("2025-08-01"), new Date("2025-10-13"));
