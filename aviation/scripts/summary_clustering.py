import pandas as pd
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD, PCA
from sklearn.preprocessing import normalize
import sys
import json

nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
unnecessary_words = ["crashed", "aircraft", "plane", "pilot", "crew", "flight", "runway", "approach", "taking", "mile", "attempting",
              "route", "en", "ft", "due", "foot", "left", "right", "shortly", "two", "one", "short", "minute", "caused", "procedure",
              "cause", "caused", "procedure","airplane","turn","km","resulted","went","minimum","attempted","maintain","causing",
              "contributing","final","second","factor","take","took","first","resulting","three", "named","could","later","making",
              "possible","north","may","member", "decided", "four", "began", "also","il","west","several","hour","onto","fl","day","u","san","de","la",
              "instead", "airport"]

generic_words = ["get", "came", "going", "became", "started", "many", "moment", "time", "day", "way", "part", "place",
                 "used", "use", "around", "area", "back", "front", "top", "point", "hand", "among", "along", "next", "across",
                 "among", "among", "already", "early", "late", "approximately", "eventually", "later", "long", "shortly",
                 "still", "suddenly", "sooner", "thereafter", "never", "before", "since", "after", "past", "soon", "within"]

unrelated_words = ["singer", "soccer", "boy", "girl", "george", "john", "man", "woman", "son", "daughter", "home", "house",
                   "town", "city", "island", "state", "district", "fort", "neighborhood", "stadium"]

people_words = ["president", "instructor", "trainee", "worker", "team",
                "survivor", "student", "official"]

filler_words = ["good", "bad", "hard", "soft", "strong", "weak", "large", "small", "full", "half", "several", "another",
                "both", "few", "one", "two", "three", "four", "five", "six", "seven", "eight", "ten", "hundred", "some",
                "any", "every", "most", "more", "less"]

abstract_words = ["try", "tried", "trying", "get", "getting", "go", "going", "come", "came", "became", "become", "allow",
                  "allowed", "ensuring", "attempting", "attempt", "attempted", "ensure", "cause", "caused", "causing",
                  "continue", "continued", "continued", "continuing"]

other_domain_words = ["singer", "soccer", "patient", "rice", "george", "john", "maria", "war", "soldier", "bomb",
                 "soviet", "japanese", "german", "british", "paris", "france",
                 "rome", "london", "moscow", "tokyo", "american", "federal"]

ambiguous_words = ["thing", "something", "nothing", "everything", "stuff", "issue", "result", "factor", "reason"]

misc_words = ["called", "named", "told", "said", "asked", "heard", "seen", "seeing", "showed", "showing", "seen",
                 "visible", "visibly", "invisible", "hidden", "show", "showing", "looked"]

custom_stopwords = set(
    unnecessary_words +
    generic_words +
    unrelated_words +
    people_words +
    filler_words +
    abstract_words +
    other_domain_words +
    ambiguous_words +
    misc_words
)

stop_words = set(stopwords.words('english')).union(custom_stopwords)

def clustering_main(input_file, output_file):
    try:
        df = pd.read_csv(input_file, delimiter=',')
    except:
        try:
            df = pd.read_csv(input_file, delimiter='\t')
        except:
            df = pd.read_csv(input_file, delimiter=None, engine='python')
    
    if 'Summary' not in df.columns:
        possible_columns = [col for col in df.columns if 'summ' in col.lower() or 'desc' in col.lower()]
        if possible_columns:
            summary_column = possible_columns[0]
        else:
            raise ValueError("Couldn't find a column containing summaries.")
    else:
        summary_column = 'Summary'

    df = df.dropna(subset=[summary_column]).reset_index(drop=True)

    def preprocess_text(text):
        if not isinstance(text, str):
            return ""

        text = text.lower()
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        tokens = word_tokenize(text)
        tokens = [word for word in tokens if word not in stop_words and len(word) > 2]
        lemmatizer = WordNetLemmatizer()
        tokens = [lemmatizer.lemmatize(word) for word in tokens]

        return ' '.join(tokens)

    df['processed_summary'] = df[summary_column].apply(preprocess_text)
    df = df[df['processed_summary'].str.strip() != ""].reset_index(drop=True)

    # Create TF-IDF vectors
    tfidf_vectorizer = TfidfVectorizer(max_features=1000, min_df=1)
    tfidf_matrix = tfidf_vectorizer.fit_transform(df['processed_summary'])
    
    # Normalize the TF-IDF vectors
    tfidf_norm = normalize(tfidf_matrix)

    # Dimensionality reduction
    n_components = min(20, tfidf_norm.shape[1] - 1, tfidf_norm.shape[0] - 1)
    svd = TruncatedSVD(n_components=n_components)
    reduced_features = svd.fit_transform(tfidf_norm)
    # Save the first two dimensions as x, y coordinates for visualization
    df['x'] = reduced_features[:, 0]
    df['y'] = reduced_features[:, 1]
    # Use domain knowledge to determine number of clusters
    n_clusters = min(30, len(df) - 1)  # Ensure we don't have more clusters than data points

    # Perform K-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['kmeans_cluster'] = kmeans.fit_predict(reduced_features)

    # Function to interpret clusters based on top terms
    def interpret_cluster(terms):
        # Extract just the words from the terms
        words = [term[0] for term in terms]

        # Define crash reason categories and associated keywords
        reason_categories = {
            'Weather-related': ['storm', 'weather', 'lightning', 'thunderstorm', 'fog', 'rain', 'downdraft', 'wind'],
            'Shot down/Military action': ['shot', 'military', 'aircraft', 'british', 'fire', 'navy', 'army', 'german'],
            'Explosion/Fire': ['explode', 'explosion', 'fire', 'burn', 'flame', 'ignite'],
            'Gas-related': ['hydrogen', 'gas', 'vented', 'ignited'],
            'Control loss': ['control', 'lost', 'nose', 'dive', 'altitude'],
            'Mechanical failure': ['propeller', 'mechanical', 'failure', 'wire', 'structure', 'loose', 'separated', 'failed'],
            'Pilot error': ['error', 'attempt', 'landing', 'repositioning', 'reposition', 'maneuver'],
            'Test/Demonstration flight': ['demonstration', 'test', 'show']
        }

        # Score each category
        category_scores = {}
        for category, keywords in reason_categories.items():
            score = sum(1 for word in words if any(keyword in word for keyword in keywords))
            category_scores[category] = score

        # Find best matching category
        top_category = max(category_scores.items(), key=lambda x: x[1])

        # If no strong match, check for specific keywords
        if top_category[1] == 0:
            return "Unclear cause"

        return top_category[0]

    def analyze_clusters(df, cluster_column, tfidf_matrix, vectorizer, summary_column, n_terms=15):
        # Get feature names
        feature_names = vectorizer.get_feature_names_out()
        interpretation_column = f'{cluster_column}_interpretation'
        df[interpretation_column] = ""

        for cluster_id in sorted(df[cluster_column].unique()):
            cluster_mask = df[cluster_column] == cluster_id
            cluster_doc_indices = df.index[cluster_mask].tolist()

            if not cluster_doc_indices:
                continue

            # Sum TF-IDF values for documents in this cluster
            cluster_tfidf = tfidf_matrix[cluster_doc_indices].toarray().sum(axis=0)

            # Get indices of top terms
            top_indices = cluster_tfidf.argsort()[-n_terms:][::-1]

            # Get top terms and their scores
            top_terms = [(feature_names[i], cluster_tfidf[i]) for i in top_indices if cluster_tfidf[i] > 0]

            if top_terms:
                interpretation = interpret_cluster(top_terms)
                df.loc[cluster_mask, interpretation_column] = interpretation
            else:
                df.loc[cluster_mask, interpretation_column] = "Unclear cause"

        return df

    df = analyze_clusters(df, 'kmeans_cluster', tfidf_matrix, tfidf_vectorizer, summary_column)

    # Prepare JSON data structure (minimal, just for compatibility)
    clusters_data = []
    for cluster_id in sorted(df['kmeans_cluster'].unique()):
        cluster_mask = df['kmeans_cluster'] == cluster_id
        clusters_data.append({
            "id": int(cluster_id),
            "interpretation": df.loc[cluster_mask, 'kmeans_cluster_interpretation'].iloc[0] if any(cluster_mask) else "Unclear cause",
            "size": int(cluster_mask.sum())
        })
    
    # Save minimal JSON output
    with open(output_file, 'w') as f:
        json.dump({"kmeans": {"clusters": clusters_data}}, f)
    
    # Save results to CSV (the main output we care about)
    print("Saving results to CSV...")
    csv_output_file = '../../planecrash_data/aircraft_crashes_clustered.csv'
    df.to_csv(csv_output_file, index=False)