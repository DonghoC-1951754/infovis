import requests
from bs4 import BeautifulSoup
import csv

# Target URL
url = "https://www.avcodes.co.uk/regprefixcur.asp"
headers = {
    "User-Agent": "Mozilla/5.0"
}
response = requests.get(url, headers=headers)
response.raise_for_status()

# Parse HTML
soup = BeautifulSoup(response.text, "html.parser")

# Find the table body
# tbody = soup.find("tbody")
rows = soup.find_all("tr")

# Extract data
data = []
for row in rows:
    tds = row.find_all("td")
    if len(tds) >= 4:
        first_four = [td.get_text(strip=True) for td in tds[:4]]
        data.append(first_four)

# Optional: set column headers
headers = ["Current Prefix", "Old Prefix", "Country Name", "Period"]

# Save to CSV
with open("planecrash_data/registration_prefixes.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(data)