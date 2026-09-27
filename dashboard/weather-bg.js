const VIDEO_MAP = {
  'clear': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4b/Time_Lapse_of_Sun_and_Clouds.webm/Time_Lapse_of_Sun_and_Clouds.webm.480p.vp9.webm',
  'cloudy': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1b/Clouds_Moving_in_the_Sky.webm/Clouds_Moving_in_the_Sky.webm.480p.vp9.webm',
  'rain': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e0/Rain_falling_on_a_street.webm/Rain_falling_on_a_street.webm.480p.vp9.webm',
  'thunder': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fc/Lightning_strike_in_slow_motion.webm/Lightning_strike_in_slow_motion.webm.480p.vp9.webm'
};

// Map WMO weather codes to our visual categories
function getWeatherCategory(code) {
  // WMO Codes: 0=Clear, 1-3=Partly cloudy, 45-49=Fog, 51-69=Rain/Drizzle, 71-79=Snow, 80-82=Showers, 95-99=Thunderstorm
  if (code <= 1) return 'clear';
  if (code <= 49) return 'cloudy';
  if (code <= 82) return 'rain';
  return 'thunder';
}

function setVideoBackground(lat, lon) {
  console.log(`Fetching weather for: ${lat}, ${lon}`);
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
    .then(res => res.json())
    .then(data => {
      const code = data.current_weather.weathercode;
      const category = getWeatherCategory(code);
      console.log(`Weather code: ${code}, Category: ${category}`);
      
      const video = document.getElementById('bg-video');
      if (video && video.src !== VIDEO_MAP[category]) {
        video.src = VIDEO_MAP[category];
      }
    })
    .catch(err => console.error("Weather fetch failed", err));
}

// Get user location
document.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => setVideoBackground(position.coords.latitude, position.coords.longitude),
      (error) => setVideoBackground(22.57, 88.36) // Default to Kolkata if blocked
    );
  } else {
    setVideoBackground(22.57, 88.36);
  }
});
