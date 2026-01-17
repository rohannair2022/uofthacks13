import React, { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";

export default function GlobeBasic() {
  const globeEl = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [states, setStates] = useState([]);
  const [altitude, setAltitude] = useState(2.5);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [stateIntel, setStateIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    // Load Country Borders (GeoJSON)
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then(setCountries)
      .catch((err) => console.error("Failed to load countries:", err));

    // Load States/Provinces - FIXED URL
    fetch(
      "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/states.csv",
    )
      .then((res) => res.text())
      .then((csvText) => {
        const lines = csvText.split("\n");
        const headers = lines[0].split(",");

        // Find column indices
        const idIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "id",
        );
        const nameIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "name",
        );
        const countryNameIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "country_name",
        );
        const countryCodeIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "country_code",
        );
        const latIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "latitude",
        );
        const lngIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "longitude",
        );

        // Parse all states
        const allStates = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",");
            return {
              id: values[idIndex]?.replace(/"/g, "").trim(),
              name: values[nameIndex]?.replace(/"/g, "").trim(),
              country: values[countryNameIndex]?.replace(/"/g, "").trim(),
              country_code: values[countryCodeIndex]?.replace(/"/g, "").trim(),
              lat: parseFloat(values[latIndex]),
              lng: parseFloat(values[lngIndex]),
            };
          })
          .filter(
            (state) => state.name && !isNaN(state.lat) && !isNaN(state.lng),
          );

        setStates(allStates);
        console.log(`Loaded ${allStates.length} states/provinces`);
      })
      .catch((err) => console.error("Failed to load states:", err));
  }, []);

  const handleZoom = () => {
    if (globeEl.current) {
      const alt = globeEl.current.pointOfView().altitude;
      setAltitude(alt);
    }
  };

  const handleStateClick = (state) => {
    setSelectedState(state);
    setStateIntel(null);
    setLoadingIntel(true);

    // Smooth Zoom In
    if (globeEl.current) {
      globeEl.current.pointOfView(
        {
          lat: state.lat,
          lng: state.lng,
          altitude: 0.3,
        },
        1500,
      );
    }

    // Call Backend Agent - FIXED PARAMETERS
    fetch(
      `http://localhost:3001/api/research?state=${encodeURIComponent(state.name)}&country=${encodeURIComponent(state.country)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Backend unavailable");
        return res.json();
      })
      .then((data) => {
        setStateIntel(data);
        setLoadingIntel(false);
      })
      .catch((err) => {
        console.error("Failed to fetch state intel:", err);
        setStateIntel({
          summary: `${state.name} is a state/province in ${state.country}. Connect to backend server for detailed insights.`,
          spots: [],
        });
        setLoadingIntel(false);
      });
  };

  // --- 3. RENDERING ---

  const showCountries = altitude < 2.0;
  const showStates = altitude < 1.2;

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000011",
      }}
    >
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // Country Layer (Borders)
        polygonsData={showCountries ? countries.features : []}
        polygonAltitude={0.01}
        polygonCapColor={(d) =>
          d === hoveredCountry ? "rgba(100, 200, 255, 0.2)" : "rgba(0,0,0,0)"
        }
        polygonSideColor={() => "rgba(255, 255, 255, 0.05)"}
        polygonStrokeColor={() => "#559"}
        onPolygonHover={setHoveredCountry}
        onPolygonClick={(d) => {
          // FIXED: Proper centroid calculation for MultiPolygon
          if (globeEl.current) {
            let lat = 0;
            let lng = 0;

            if (d.properties && d.properties.LAT && d.properties.LON) {
              lat = d.properties.LAT;
              lng = d.properties.LON;
            } else if (d.geometry) {
              try {
                const coords = [];
                const extractCoords = (geom) => {
                  if (geom.type === "Polygon") {
                    geom.coordinates[0].forEach((c) => coords.push(c));
                  } else if (geom.type === "MultiPolygon") {
                    geom.coordinates.forEach((poly) => {
                      poly[0].forEach((c) => coords.push(c));
                    });
                  }
                };
                extractCoords(d.geometry);

                if (coords.length > 0) {
                  lng =
                    coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
                  lat =
                    coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
                }
              } catch (err) {
                console.error("Error calculating centroid:", err);
              }
            }

            globeEl.current.pointOfView({ lat, lng, altitude: 0.8 }, 1000);
          }
        }}
        // State Layer (Pins)
        pointsData={showStates ? states : []}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#FFD700"}
        pointRadius={0.1}
        pointAltitude={0.02}
        pointLabel="name"
        onPointClick={handleStateClick}
        onZoom={handleZoom}
      />

      {/* --- UI: Country Info Box (Mid-Zoom) --- */}
      {hoveredCountry && showCountries && !showStates && (
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 10, 30, 0.9)",
            color: "#fff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #446",
            backdropFilter: "blur(10px)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <h1 style={{ margin: "0 0 10px 0", fontSize: "2rem" }}>
            {hoveredCountry.properties.ADMIN || hoveredCountry.properties.NAME}
          </h1>
          <div
            style={{
              display: "flex",
              gap: "20px",
              fontSize: "0.9rem",
              color: "#aaa",
              justifyContent: "center",
            }}
          >
            {hoveredCountry.properties.REGION_UN && (
              <div>
                <strong>Region</strong>
                <br />
                {hoveredCountry.properties.REGION_UN}
              </div>
            )}
            {hoveredCountry.properties.POP_EST && (
              <div>
                <strong>Population</strong>
                <br />
                {(hoveredCountry.properties.POP_EST / 1000000).toFixed(1)} M
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- UI: Sidebar (State Details) --- */}
      {selectedState && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "400px",
            height: "100%",
            background: "rgba(12, 12, 24, 0.95)",
            borderLeft: "1px solid #334",
            padding: "40px 30px",
            color: "white",
            overflowY: "auto",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.8)",
          }}
        >
          <button
            onClick={() => setSelectedState(null)}
            style={{
              float: "right",
              background: "transparent",
              border: "none",
              color: "#667",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <h5
            style={{
              color: "#667",
              textTransform: "uppercase",
              letterSpacing: "2px",
              fontSize: "0.8rem",
            }}
          >
            {selectedState.country}
          </h5>
          <h1
            style={{
              margin: "10px 0 30px 0",
              fontSize: "2.5rem",
              color: "#FFD700",
            }}
          >
            {selectedState.name}
          </h1>

          <div
            style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: "20px" }}
          >
            <div>
              📍 {selectedState.lat.toFixed(2)}°, {selectedState.lng.toFixed(2)}
              °
            </div>
            <div>🌍 {selectedState.country_code}</div>
          </div>

          {loadingIntel ? (
            <div
              style={{ color: "#88a", fontStyle: "italic", marginTop: "50px" }}
            >
              🕵️ Connecting to local agent... <br />
              Scouring forums for niche spots...
            </div>
          ) : stateIntel ? (
            <div className="fade-in">
              {stateIntel ? (
                <div className="fade-in">
                  {/* Existing summary */}
                  <p
                    style={{
                      fontSize: "1.1rem",
                      lineHeight: "1.6",
                      fontStyle: "italic",
                      borderLeft: "3px solid #FFD700",
                      paddingLeft: "15px",
                      color: "#ccd",
                    }}
                  >
                    "{stateIntel.summary}"
                  </p>

                  {/* --- NEW: Sources Display --- */}
                  {stateIntel.sources && stateIntel.sources.length > 0 && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "15px",
                        background: "rgba(0, 30, 60, 0.3)",
                        borderRadius: "8px",
                        border: "1px solid #334",
                      }}
                    >
                      <h4
                        style={{
                          marginTop: "0",
                          marginBottom: "10px",
                          color: "#88a",
                          fontSize: "0.9rem",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        Sources Analyzed
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        {stateIntel.sources.map((source, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              background: "rgba(255, 255, 255, 0.05)",
                              borderRadius: "6px",
                              border: "1px solid #445",
                            }}
                          >
                            <span style={{ fontSize: "1.2rem" }}>
                              {source.icon}
                            </span>
                            <div>
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                  color: "#aad",
                                }}
                              >
                                {source.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#889",
                                }}
                              >
                                {source.type} • {source.reliability}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Agent Performance Summary */}
                      {stateIntel.agents_summary && (
                        <div
                          style={{
                            marginTop: "15px",
                            paddingTop: "15px",
                            borderTop: "1px solid #334",
                            fontSize: "0.8rem",
                            color: "#889",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {stateIntel.agents_summary.successful_agents}/
                            {stateIntel.agents_summary.total_agents} agents
                            responded
                          </span>
                          <span>{stateIntel.execution_time}ms</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Existing spots display remains the same */}
                  {stateIntel.spots && stateIntel.spots.length > 0 && (
                    <>
                      <h3
                        style={{
                          marginTop: "40px",
                          borderBottom: "1px solid #334",
                          paddingBottom: "10px",
                        }}
                      >
                        Local Secrets
                      </h3>

                      {stateIntel.spots.map((spot, i) => (
                        <div
                          key={i}
                          style={{
                            margin: "20px 0",
                            padding: "15px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <h3 style={{ margin: 0, color: "#aaf" }}>
                              {spot.name}
                            </h3>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                background: "#335",
                                padding: "3px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              {spot.category}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "0.9rem",
                              color: "#ccc",
                              margin: "10px 0",
                            }}
                          >
                            {spot.why_cool}
                          </p>

                          {/* NEW: Source attribution for each spot */}
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#668",
                              marginTop: "8px",
                              fontStyle: "italic",
                            }}
                          >
                            💡 Based on local expert insights
                          </div>

                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#f77",
                              marginTop: "10px",
                            }}
                          >
                            <strong>Skip:</strong> {spot.avoid}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Optional: Show data from other agents if available */}
                  {stateIntel.data && (
                    <div style={{ marginTop: "40px" }}>
                      <h3
                        style={{
                          borderBottom: "1px solid #334",
                          paddingBottom: "10px",
                        }}
                      >
                        Additional Insights
                      </h3>

                      {/* Reddit Sentiment */}
                      {stateIntel.data.reddit_sentiment &&
                        stateIntel.data.reddit_sentiment.summary && (
                          <div
                            style={{
                              margin: "15px 0",
                              padding: "15px",
                              background: "rgba(255, 69, 0, 0.05)",
                              borderRadius: "8px",
                              borderLeft: "3px solid #FF4500",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "10px",
                              }}
                            >
                              <img
                                src="/reddit.png"
                                alt="Reddit"
                                style={{
                                  width: "1.2rem",
                                  height: "1.2rem",
                                  objectFit: "contain",
                                }}
                              />
                              <span
                                style={{ fontWeight: "bold", color: "#FF4500" }}
                              >
                                Reddit Community
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.9rem",
                                color: "#ccc",
                                margin: 0,
                              }}
                            >
                              {stateIntel.data.reddit_sentiment.summary}
                            </p>
                          </div>
                        )}

                      {/* TripAdvisor Sentiment */}
                      {stateIntel.data.tripadvisor_sentiment &&
                        stateIntel.data.tripadvisor_sentiment.summary && (
                          <div
                            style={{
                              margin: "15px 0",
                              padding: "15px",
                              background: "rgba(0, 150, 0, 0.05)",
                              borderRadius: "8px",
                              borderLeft: "3px solid #00A800",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "10px",
                              }}
                            >
                              <img
                                src="/tripadvisor.png"
                                alt="TripAdvisor"
                                style={{
                                  width: "1.2rem",
                                  height: "1.2rem",
                                  objectFit: "contain",
                                }}
                              />
                              <span
                                style={{ fontWeight: "bold", color: "#00A800" }}
                              >
                                Traveler Reviews
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.9rem",
                                color: "#ccc",
                                margin: 0,
                              }}
                            >
                              {stateIntel.data.tripadvisor_sentiment.summary}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "#88a", marginTop: "30px" }}>
                  💡 Agent unavailable. Start backend server on port 3001.
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: "#88a", marginTop: "30px" }}>
              💡 Agent unavailable. Start backend server on port 3001.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
