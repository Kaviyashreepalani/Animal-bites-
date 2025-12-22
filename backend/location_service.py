"""
Location service for finding nearby animal bite treatment centers
Using OpenStreetMap Overpass API and Nominatim for geocoding
"""

import requests
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def geocode_location(location_query: str) -> Optional[Dict]:
    """
    Convert location name/address to coordinates using Nominatim API
    
    Args:
        location_query: City name, address, or location string
        
    Returns:
        Dict with lat, lon, display_name or None if not found
    """
    try:
        # Nominatim API (free OpenStreetMap geocoding)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": location_query,
            "format": "json",
            "limit": 1,
            "countrycodes": "in",  # Restrict to India
            "addressdetails": 1
        }
        headers = {
            "User-Agent": "AnimalBiteChatbot/1.0"  # Required by Nominatim
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        results = response.json()
        if results:
            result = results[0]
            return {
                "lat": float(result["lat"]),
                "lon": float(result["lon"]),
                "display_name": result["display_name"],
                "address": result.get("address", {})
            }
        
        logger.warning(f"No geocoding results for: {location_query}")
        return None
        
    except Exception as e:
        logger.error(f"Geocoding error for '{location_query}': {e}")
        return None


def find_nearby_facilities(lat: float, lon: float, radius_km: int = 10) -> List[Dict]:
    """
    Find hospitals and clinics near given coordinates using Overpass API
    
    Args:
        lat: Latitude
        lon: Longitude
        radius_km: Search radius in kilometers (default 10km)
        
    Returns:
        List of facility dictionaries with name, distance, coordinates, etc.
    """
    try:
        # Convert km to meters for Overpass API
        radius_m = radius_km * 1000
        
        # Overpass API query for hospitals and clinics
        # amenity=hospital covers hospitals
        # amenity=clinic covers smaller clinics
        # healthcare=* covers various healthcare facilities
        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Overpass QL query
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:{radius_m},{lat},{lon});
          way["amenity"="hospital"](around:{radius_m},{lat},{lon});
          node["amenity"="clinic"](around:{radius_m},{lat},{lon});
          way["amenity"="clinic"](around:{radius_m},{lat},{lon});
          node["healthcare"](around:{radius_m},{lat},{lon});
          way["healthcare"](around:{radius_m},{lat},{lon});
        );
        out body;
        >;
        out skel qt;
        """
        
        response = requests.post(overpass_url, data={"data": query}, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        facilities = []
        
        # Process results
        for element in data.get("elements", []):
            if element.get("type") in ["node", "way"]:
                tags = element.get("tags", {})
                
                # Get coordinates
                if element["type"] == "node":
                    facility_lat = element["lat"]
                    facility_lon = element["lon"]
                elif element["type"] == "way":
                    # For ways, calculate center from nodes
                    # (simplified - just skip ways for now, or get from center)
                    continue
                else:
                    continue
                
                # Extract facility information
                name = tags.get("name", "Unnamed Facility")
                amenity = tags.get("amenity", tags.get("healthcare", "healthcare"))
                
                # Calculate distance (rough approximation)
                distance_km = calculate_distance(lat, lon, facility_lat, facility_lon)
                
                # Get additional info
                phone = tags.get("phone", tags.get("contact:phone", ""))
                address = tags.get("addr:full", "")
                if not address:
                    street = tags.get("addr:street", "")
                    city = tags.get("addr:city", "")
                    address = f"{street}, {city}".strip(", ")
                
                facility = {
                    "name": name,
                    "type": amenity,
                    "lat": facility_lat,
                    "lon": facility_lon,
                    "distance_km": round(distance_km, 2),
                    "phone": phone,
                    "address": address,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query={facility_lat},{facility_lon}",
                    "osm_url": f"https://www.openstreetmap.org/?mlat={facility_lat}&mlon={facility_lon}&zoom=17"
                }
                
                facilities.append(facility)
        
        # Sort by distance
        facilities.sort(key=lambda x: x["distance_km"])
        
        # Limit to top 15 results
        return facilities[:15]
        
    except Exception as e:
        logger.error(f"Error finding facilities near {lat},{lon}: {e}")
        return []


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    
    Returns:
        Distance in kilometers
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    distance = R * c
    return distance


def search_facilities_by_location(location_query: str, radius_km: int = 10) -> Dict:
    """
    Main function: Search for healthcare facilities by location query
    
    Args:
        location_query: Location name/address to search near
        radius_km: Search radius in kilometers
        
    Returns:
        Dict with location info and list of facilities
    """
    # Step 1: Geocode the location
    location = geocode_location(location_query)
    
    if not location:
        return {
            "success": False,
            "error": "Could not find the specified location. Please try a different location name.",
            "facilities": []
        }
    
    # Step 2: Find nearby facilities
    facilities = find_nearby_facilities(location["lat"], location["lon"], radius_km)
    
    if not facilities:
        return {
            "success": True,
            "location": location,
            "message": f"No healthcare facilities found within {radius_km}km of {location['display_name']}. Try increasing the search radius.",
            "facilities": []
        }
    
    return {
        "success": True,
        "location": location,
        "facilities": facilities,
        "total_found": len(facilities)
    }