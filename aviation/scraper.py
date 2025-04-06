import requests
from bs4 import BeautifulSoup
import csv
import time
import os
import brotli
from urllib.request import urlopen as uReq


# Maak een directory voor de resultaten
if not os.path.exists('planecrash_data'):
    os.makedirs('planecrash_data')

# Functie om een enkel jaar te verwerken
def process_year(year):
    print(f"Verwerking van jaar {year}...")
    
    # Haal de hoofdpagina van het jaar op
    year_url = f"https://www.planecrashinfo.com/{year}/{year}.htm"
    print(f"Ophalen van {year_url}")
    
    try:
        # response = requests.get(year_url)
        # content = brotli.decompress(response.content)
        # print(content)
        # print(response.content[:500])
        # print(response.headers)
        # print(response.text)
        # print(response.encoding)
        uClient = uReq(year_url)
        page_html = uClient.read()
        uClient.close()
        page_html = brotli.decompress(page_html)
        # if response.status_code != 200:
        #     print(f"Kon pagina niet ophalen voor jaar {year}. Status code: {response.status_code}")
        #     return []
        
        soup = BeautifulSoup(page_html, "html.parser")
        accidents = []
        
        # Zoek de hoofdtabel die de ongevallen bevat
        main_table = None
        print(soup.prettify())
        tables = soup.find_all('table')
        print(f"Aantal tabellen gevonden op de pagina: {len(tables)}")
        
        # Zoek de juiste tabel (meestal de grootste tabel op de pagina)
        if tables:
            # Sorteer op grootte (aantal rijen)
            main_table = max(tables, key=lambda table: len(table.find_all('tr')))
        
        if not main_table:
            print(f"Geen ongevallentabel gevonden voor jaar {year}")
            return []
            
        rows = main_table.find_all('tr')
        print(f"Aantal rijen in de tabel: {len(rows)}")
        
        # Controleer of er een koptekstrij is en bepaal de indices van kolommen
        if len(rows) <= 1:
            print(f"Niet genoeg rijen in de tabel voor jaar {year}")
            return []
            
        header_row = rows[0]
        header_cells = header_row.find_all('td') or header_row.find_all('th')
        
        # Bepaal kolommen op basis van inhoud van koptekst
        date_idx = location_idx = aircraft_idx = fatalities_idx = None
        for i, cell in enumerate(header_cells):
            cell_text = cell.text.strip().lower()
            if 'date' in cell_text:
                date_idx = i
            elif 'location' in cell_text or 'operator' in cell_text:
                location_idx = i
            elif 'aircraft' in cell_text or 'type' in cell_text:
                aircraft_idx = i
            elif 'fat' in cell_text:  # "Fatalities" of vergelijkbaar
                fatalities_idx = i
        
        # Als we niet alle benodigde kolommen kunnen vinden, probeer dan standaard indices
        if date_idx is None or location_idx is None or aircraft_idx is None or fatalities_idx is None:
            print("Kon niet alle kolommen identificeren op basis van koptekst, gebruik standaard indices")
            date_idx = 0
            location_idx = 1
            aircraft_idx = 2
            fatalities_idx = 3
        
        # Sla de header-rij over en verwerk alle andere rijen
        for i, row in enumerate(rows[1:], 1):
            print(f"Verwerking van ongeval {i} voor jaar {year}")
            
            # Haal alle cellen van de rij op
            cells = row.find_all('td')
            if len(cells) <= max(date_idx, location_idx, aircraft_idx, fatalities_idx):
                print(f"Rij heeft niet genoeg cellen, wordt overgeslagen")
                continue
            
            # Haal de basisinformatie op
            date_cell = cells[date_idx]
            date = date_cell.text.strip()
            
            location_text = cells[location_idx].text.strip()
            location_parts = location_text.split('\n') if '\n' in location_text else [location_text, ""]
            location = location_parts[0].strip()
            operator = location_parts[1].strip() if len(location_parts) > 1 else ""
            
            aircraft_text = cells[aircraft_idx].text.strip()
            aircraft_parts = aircraft_text.split('\n') if '\n' in aircraft_text else [aircraft_text, ""]
            ac_type = aircraft_parts[0].strip()
            registration = aircraft_parts[1].strip() if len(aircraft_parts) > 1 else ""
            
            fatalities = cells[fatalities_idx].text.strip()
            
            # Zoek de link naar de detailpagina
            detail_link = date_cell.find('a')
            details = {}
            
            if detail_link and detail_link.get('href'):
                detail_href = detail_link.get('href')
                detail_url = f"https://www.planecrashinfo.com/{year}/{detail_href}"
                print(f"Detailpagina gevonden: {detail_url}")
                
                # Haal de detailpagina op
                try:
                    detail_response = requests.get(detail_url)
                    if detail_response.status_code == 200:
                        detail_soup = BeautifulSoup(detail_response.text, 'html.parser')
                        detail_table = detail_soup.find('table')
                        
                        if detail_table:
                            # Verwerk elke rij in de detailtabel
                            for detail_row in detail_table.find_all('tr'):
                                detail_cells = detail_row.find_all('td')
                                if len(detail_cells) == 2:
                                    key = detail_cells[0].text.strip().rstrip(':')
                                    value = detail_cells[1].text.strip()
                                    details[key] = value
                                    print(f"Detail gevonden: {key} = {value}")
                    else:
                        print(f"Kon detailpagina niet ophalen. Status code: {detail_response.status_code}")
                except Exception as e:
                    print(f"Fout bij het ophalen van detailpagina: {e}")
                
                # Wacht even om de server niet te overbelasten
                time.sleep(1)
            
            # Maak een volledig record
            accident = {
                'Date': date,
                'Location': location,
                'Operator': operator,
                'AC Type': ac_type,
                'Registration': registration,
                'Fatalities': fatalities,
                'Year': year
            }
            
            # Voeg details toe
            for key, value in details.items():
                accident[key] = value
            
            accidents.append(accident)
            print(f"Ongeval toegevoegd aan lijst: {date}, {location}")
        
        return accidents
    
    except Exception as e:
        print(f"Fout bij het verwerken van jaar {year}: {e}")
        return []
 

def load_existing_data(csv_path):
    """Laadt bestaande data uit de CSV en retourneert een set met unieke records (op basis van datum en locatie)."""
    existing_records = set()
    
    if os.path.exists(csv_path):
        with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                existing_records.add((row['Date'], row['Location']))
    
    return existing_records


# Hoofdfunctie
def main():
    csv_path = 'aviation/planecrash_data/vliegtuigongevallen.csv'
    existing_data = load_existing_data(csv_path)  # Laad bestaande records
    
    years_to_process = list(range(2024, 2026))
    all_accidents = []

    for year in years_to_process:
        accidents = process_year(year)
        
        # Filter nieuwe ongevallen (geen dubbele toevoegen)
        new_accidents = [acc for acc in accidents if (acc['Date'], acc['Location']) not in existing_data]
        all_accidents.extend(new_accidents)
        
        # Voeg nieuwe records toe aan de set
        for accident in new_accidents:
            existing_data.add((accident['Date'], accident['Location']))
        
        print(f"Nieuwe ongevallen voor jaar {year}: {len(new_accidents)}")
        time.sleep(2)  # Wacht tussen jaren
    
    if not all_accidents:
        print("Geen nieuwe ongevallen gevonden. CSV wordt niet bijgewerkt.")
        return
    
    # Bepaal unieke velden
    fieldnames = set()
    for accident in all_accidents:
        for key in accident.keys():
            fieldnames.add(key)
    
    fieldnames = sorted(list(fieldnames))
    
    # Append nieuwe data naar CSV
    with open(csv_path, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        # Schrijf alleen een header als de file nog niet bestaat
        if os.stat(csv_path).st_size == 0:
            writer.writeheader()
        
        for accident in all_accidents:
            writer.writerow(accident)
    
    print(f"Klaar! {len(all_accidents)} nieuwe ongevallen toegevoegd aan {csv_path}")

if __name__ == "__main__":
    main()
