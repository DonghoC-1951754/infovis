import requests

def get_opensky_aircraft_data(icao24):
    url = f"https://opensky-network.org/api/metadata/aircraft/icao24/{icao24}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed for {icao24}: {response.status_code}")
        return None

# Example usage with dummy ICAO24 (you'd need to map registration like "HZ-MIS" to ICAO24)
icao24 = "48429e"  # You need to look up the ICAO24 hex for the aircraft registration
aircraft_info = get_opensky_aircraft_data(icao24)
print(aircraft_info)
