import React, { useState } from "react";

const API_BASE_URL = "https://animal-bites-backend-4.onrender.com";

export default function LocationFinder() {
  const [location, setLocation] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);

  const handleSearch = async () => {
  if (!location.trim()) {
    setError("Please enter a location");
    return;
  }

  setLoading(true);
  setError(null);
  setSearchPerformed(false);
  setFacilities([]);

  try {
    console.log(`Searching for facilities near: ${location}`);
    console.log(`API URL: ${API_BASE_URL}/api/location/search-facilities`);
    
    const response = await fetch(`${API_BASE_URL}/api/location/search-facilities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        location: location,
        radius_km: radiusKm,
      }),
      mode: 'cors', // Add this
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Search results:", data);

    if (data.success) {
      setFacilities(data.facilities || []);
      setLocationInfo(data.location);
      setSearchPerformed(true);
      
      if (data.facilities && data.facilities.length === 0) {
        setError(data.message || "No facilities found in this area");
      }
    } else {
      setError(data.error || "Failed to search facilities");
    }
  } catch (err) {
    console.error("Search error:", err);
    setError(`Connection failed: ${err.message}. Check if backend is running.`);
  } finally {
    setLoading(false);
  }
};

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const openInMaps = (facility) => {
    window.open(facility.maps_url, "_blank");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: "1000px",
        margin: "0 auto",
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          textAlign: "center"
        }}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "32px", fontWeight: "bold" }}>
            🏥 Find Nearby Treatment Centers
          </h1>
          <p style={{ margin: 0, fontSize: "16px", opacity: 0.9 }}>
            Locate hospitals and clinics for animal bite treatment near you
          </p>
        </div>

        {/* Search Section */}
        <div style={{
          padding: "30px",
          borderBottom: "2px solid #f3f4f6"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Enter Your Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Chennai, Bangalore, Delhi, or your area"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border 0.3s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#374151"
              }}>
                Search Radius: {radiusKm} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer"
                }}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                border: "none",
                background: loading 
                  ? "#9ca3af" 
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
              }}
            >
              {loading ? "🔍 Searching..." : "🔍 Search Facilities"}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: "15px",
              padding: "12px 16px",
              background: "#fee2e2",
              color: "#dc2626",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div style={{ padding: "30px" }}>
          {searchPerformed && locationInfo && (
            <div style={{
              marginBottom: "20px",
              padding: "15px",
              background: "#f0fdf4",
              borderRadius: "12px",
              border: "2px solid #86efac"
            }}>
              <div style={{ fontSize: "14px", color: "#166534", fontWeight: "600" }}>
                📍 Searching near: {locationInfo.display_name}
              </div>
              <div style={{ fontSize: "12px", color: "#15803d", marginTop: "5px" }}>
                Found {facilities.length} facilities within {radiusKm} km
              </div>
            </div>
          )}

          {facilities.length > 0 && (
            <div style={{
              display: "grid",
              gap: "15px"
            }}>
              <h2 style={{
                margin: "0 0 10px 0",
                fontSize: "22px",
                fontWeight: "bold",
                color: "#1f2937"
              }}>
                Healthcare Facilities
              </h2>

              {facilities.map((facility, index) => (
                <div
                  key={index}
                  style={{
                    background: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    transition: "all 0.3s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "12px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: "0 0 5px 0",
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#1f2937"
                      }}>
                        {facility.name}
                      </h3>
                      <div style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        background: facility.type === "hospital" 
                          ? "#dbeafe" 
                          : "#fef3c7",
                        color: facility.type === "hospital" 
                          ? "#1e40af" 
                          : "#92400e",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textTransform: "capitalize"
                      }}>
                        {facility.type}
                      </div>
                    </div>
                    <div style={{
                      background: "#f3f4f6",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      color: "#667eea",
                      fontSize: "14px",
                      whiteSpace: "nowrap"
                    }}>
                      📍 {facility.distance_km} km
                    </div>
                  </div>

                  {facility.address && (
                    <div style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      marginBottom: "8px",
                      lineHeight: "1.5"
                    }}>
                      📌 {facility.address}
                    </div>
                  )}

                  {facility.phone && (
                    <div style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      marginBottom: "12px"
                    }}>
                      📞 {facility.phone}
                    </div>
                  )}

                  <button
                    onClick={() => openInMaps(facility)}
                    style={{
                      width: "100%",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.3s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    🗺️ Open in Google Maps
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchPerformed && facilities.length === 0 && !error && (
            <div style={{
              textAlign: "center",
              padding: "40px",
              color: "#6b7280"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>🔍</div>
              <p style={{ fontSize: "16px", margin: "0" }}>
                No healthcare facilities found in this area.
              </p>
              <p style={{ fontSize: "14px", margin: "10px 0 0 0" }}>
                Try searching a different location or increasing the search radius.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div style={{
        maxWidth: "1000px",
        margin: "20px auto 0",
        color: "white",
        textAlign: "center",
        fontSize: "14px",
        opacity: 0.9
      }}>
        <p style={{ margin: "5px 0" }}>
          💡 Tip: You can search by city name, area, or full address
        </p>
        <p style={{ margin: "5px 0", fontSize: "12px", opacity: 0.8 }}>
          Data provided by OpenStreetMap contributors
        </p>
      </div>
    </div>
  );
}