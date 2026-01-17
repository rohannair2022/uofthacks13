import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

export default function GlobeBasic() {
  const globeEl = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [cities, setCities] = useState([]);
  const [altitude, setAltitude] = useState(2.5);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityIntel, setCityIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    // Load Country Borders (GeoJSON)
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountries);

    // Load Cities
    fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/cities.json')
      .then(res => res.json())
      .then(data => {
        // Optimization: Take top 4000 cities to ensure smooth performance
        setCities(data.slice(0, 4000).map(c => ({
          name: c.name,
          lat: parseFloat(c.latitude),
          lng: parseFloat(c.longitude),
          country: c.country_name,
          id: c.id
        })));
      });
  }, []);

  // --- 2. LOGIC HANDLERS ---

  const handleZoom = () => {
    // Determine view layer based on altitude
    if (globeEl.current) {
      const alt = globeEl.current.pointOfView().altitude;
      setAltitude(alt);
    }
  };

  const handleCityClick = (city) => {
    setSelectedCity(city);
    setCityIntel(null);
    setLoadingIntel(true);

    // Smooth Zoom In
    globeEl.current.pointOfView({
      lat: city.lat,
      lng: city.lng,
      altitude: 0.15 // Close zoom
    }, 1500);

    // Call our Backend Agent
    fetch(`http://localhost:3001/api/research?city=${city.name}`)
      .then(res => res.json())
      .then(data => {
        setCityIntel(data);
        setLoadingIntel(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingIntel(false);
      });
  };

  // --- 3. RENDERING ---
  
  // Logic: Show countries when mid-zoom, show cities when close-zoom
  const showCountries = altitude < 2.0; 
  const showCities = altitude < 0.8; 

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000011' }}>
      
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Country Layer (Borders)
        polygonsData={showCountries ? countries.features : []}
        polygonAltitude={0.01}
        polygonCapColor={d => d === hoveredCountry ? 'rgba(100, 200, 255, 0.2)' : 'rgba(0,0,0,0)'}
        polygonSideColor={() => 'rgba(255, 255, 255, 0.05)'}
        polygonStrokeColor={() => '#559'}
        onPolygonHover={setHoveredCountry}
        onPolygonClick={(d) => {
           // Zoom to country center (approximation)
           const [lng, lat] = d.geometry.coordinates[0][0]; 
           globeEl.current.pointOfView({ lat, lng, altitude: 0.6 }, 1000);
        }}

        // City Layer (Pins)
        pointsData={showCities ? cities : []}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#FFD700'} // Gold color for pins
        pointRadius={0.15}
        pointAltitude={0.02}
        pointLabel="name"
        onPointClick={handleCityClick}

        onZoom={handleZoom}
      />

      {/* --- UI: Country Info Box (Mid-Zoom) --- */}
      {hoveredCountry && showCountries && !showCities && (
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0, 10, 30, 0.9)', color: '#fff', padding: '20px', 
          borderRadius: '12px', border: '1px solid #446', backdropFilter: 'blur(10px)',
          textAlign: 'center', pointerEvents: 'none'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>{hoveredCountry.properties.ADMIN}</h1>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#aaa' }}>
            <div>
              <strong>Region</strong><br/>
              {hoveredCountry.properties.REGION_UN}
            </div>
            <div>
              <strong>Population</strong><br/>
              {(hoveredCountry.properties.POP_EST / 1000000).toFixed(1)} M
            </div>
          </div>
        </div>
      )}

      {/* --- UI: Sidebar (City Details) --- */}
      {selectedCity && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '400px', height: '100%',
          background: 'rgba(12, 12, 24, 0.95)', borderLeft: '1px solid #334',
          padding: '40px 30px', color: 'white', overflowY: 'auto',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)'
        }}>
          <button 
            onClick={() => setSelectedCity(null)}
            style={{ float:'right', background:'transparent', border:'none', color:'#667', fontSize:'1.5rem', cursor:'pointer' }}
          >✕</button>

          <h5 style={{ color: '#667', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>
            {selectedCity.country}
          </h5>
          <h1 style={{ margin: '10px 0 30px 0', fontSize: '2.5rem', color: '#FFD700' }}>
            {selectedCity.name}
          </h1>

          {loadingIntel ? (
            <div style={{ color: '#88a', fontStyle: 'italic', marginTop: '50px' }}>
              🕵️ Connecting to local agent... <br/>
              Scouring forums for niche spots...
            </div>
          ) : cityIntel ? (
            <div className="fade-in">
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6', fontStyle: 'italic', borderLeft: '3px solid #FFD700', paddingLeft: '15px', color: '#ccd' }}>
                "{cityIntel.summary}"
              </p>

              <h3 style={{ marginTop: '40px', borderBottom: '1px solid #334', paddingBottom: '10px' }}>Local Secrets</h3>
              
              {cityIntel.spots.map((spot, i) => (
                <div key={i} style={{ margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#aaf' }}>{spot.name}</h3>
                    <span style={{ fontSize: '0.7rem', background: '#335', padding: '3px 8px', borderRadius: '4px' }}>{spot.category}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '10px 0' }}>{spot.why_cool}</p>
                  <div style={{ fontSize: '0.8rem', color: '#f77', marginTop: '10px' }}>
                    <strong>Skip:</strong> {spot.avoid}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Agent unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}