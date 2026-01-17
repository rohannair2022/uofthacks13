import { useEffect, useRef } from "react";
import Globe from "globe.gl";

// This fetches cities and distributes them evenly across the globe
async function loadAllCities() {
  const url =
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv";

  try {
    const response = await fetch(url);
    const csvText = await response.text();

    // Parse CSV
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");

    // Find column indices
    const nameIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === "name",
    );
    const latIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === "latitude",
    );
    const lngIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === "longitude",
    );

    // Parse all cities first
    const allCities = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(",");
        return {
          name: values[nameIndex]?.replace(/"/g, "").trim(),
          lat: parseFloat(values[latIndex]),
          lng: parseFloat(values[lngIndex]),
        };
      })
      .filter((city) => city.name && !isNaN(city.lat) && !isNaN(city.lng));

    // Spatially distribute cities evenly
    const distributedCities = spatiallyDistributeCities(allCities, 2500, 1.0);

    console.log(
      `Loaded ${distributedCities.length} evenly distributed cities!`,
    );
    return distributedCities;
  } catch (error) {
    console.error("Failed to load cities:", error);
    return [];
  }
}

// Distribute cities evenly across the globe using a grid-based approach
function spatiallyDistributeCities(cities, targetCount, minDistance) {
  // Shuffle cities to get variety
  const shuffled = [...cities].sort(() => Math.random() - 0.5);

  const selected = [];

  for (const city of shuffled) {
    if (selected.length >= targetCount) break;

    // Check if this city is far enough from all selected cities
    const isFarEnough = selected.every((selectedCity) => {
      const distance = calculateDistance(
        city.lat,
        city.lng,
        selectedCity.lat,
        selectedCity.lng,
      );
      return distance >= minDistance;
    });

    if (isFarEnough) {
      selected.push(city);
    }
  }

  return selected;
}

// Calculate approximate distance between two points in degrees
// (rough approximation, good enough for filtering)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  // Simple Euclidean distance with latitude correction
  const avgLat = (lat1 + lat2) / 2;
  const lngScale = Math.cos((avgLat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * lngScale * (dLng * lngScale));
}

const cities = await loadAllCities();

export default function GlobeBasic() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()(containerRef.current)
      // 🌍 Day-Night Cycle Globe
      .globeImageUrl(
        "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      )
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")

      // Enable atmosphere
      .atmosphereColor("lightskyblue")
      .atmosphereAltitude(0.25)

      // 📍 City dots
      .pointsData(cities)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointAltitude(0.02)
      .pointRadius(0.15)
      .pointColor(() => "#ffcc00")

      // 🔵 Borders around cities (rings)
      .ringsData(cities)
      .ringLat((d) => d.lat)
      .ringLng((d) => d.lng)
      .ringMaxRadius(0.6)
      .ringPropagationSpeed(0)
      .ringRepeatPeriod(0)
      .ringColor(() => ["#ffffff"])

      // 🖱️ Click handler
      .onPointClick((d) => {
        alert(`City: ${d.name}`);
      });

    // Load and display country borders
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then((countries) => {
        globe
          .polygonsData(countries.features)
          .polygonCapColor(() => "rgba(0, 0, 0, 0)")
          .polygonSideColor(() => "rgba(0, 100, 0, 0.05)")
          .polygonStrokeColor(() => "#ffffff")
          .polygonAltitude(0.01);
      });

    // Setup directional light (sun)
    const directionalLight = globe
      .scene()
      .children.find((obj) => obj.type === "DirectionalLight");
    if (directionalLight) {
      directionalLight.intensity = 0.8;
    }

    // Add animation for day-night cycle
    let sunPosX = 0;
    const animateSun = () => {
      sunPosX += 0.2;
      const sunPos = {
        x: Math.cos((sunPosX * Math.PI) / 180) * 200,
        y: Math.sin((sunPosX * Math.PI) / 180) * 200,
        z: 0,
      };

      if (directionalLight) {
        directionalLight.position.set(sunPos.x, sunPos.y, sunPos.z);
      }

      requestAnimationFrame(animateSun);
    };
    animateSun();

    // optional: gentle rotation
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.1;

    return () => {
      // let React handle cleanup
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
