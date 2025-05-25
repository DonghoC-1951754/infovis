import requests

def get_opensky_aircraft_data(icao24):
    url = f"https://opensky-network.org/api/metadata/aircraft/icao24/{icao24}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed for {icao24}: {response.status_code}")
        return None

icao24 = "48429e"
aircraft_info = get_opensky_aircraft_data(icao24)
print(aircraft_info)
