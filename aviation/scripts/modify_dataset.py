import pandas as pd

def add_operator_country(main_csv):
    prefix_df = pd.read_csv("./planecrash_data/registration_prefixes.csv")

    for index, row in main_csv.iterrows():
        registration = row['Registration']
        year = int(row['Year'])

        for prefix_index, prefix_row in prefix_df.iterrows():
            period = 0
            if not pd.isna(prefix_row['Period']):
                period = int(str(prefix_row['Period']).rstrip('-'))

            if year >= period and registration.startswith(str(prefix_row['Current Prefix'])):
                main_csv.at[index, 'Operator Country'] = prefix_row['Country Name']
                print(f"Row {index}: Registration = {row['Registration']}, Year = {row['Year']}, Country = {prefix_row['Country Name']}")
                break
            elif year < period and registration.startswith(str(prefix_row['Old Prefix'])):
                main_csv.at[index, 'Operator Country'] = prefix_row['Country Name']
                print(f"Row {index}: Registration = {row['Registration']}, Year = {row['Year']}, Country = {prefix_row['Country Name']}")
                break
    main_csv.to_csv("./planecrash_data/planecrash_dataset_with_operator_country.csv", index=False)

def main():
    main_csv = pd.read_csv("./planecrash_data/planecrash_dataset.csv")
    add_operator_country(main_csv)
    return

if __name__ == "__main__":
    main()