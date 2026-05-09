import requests

def check_anilist_api():
    url = 'https://graphql.anilist.co'
    query = '''
    query {
      Media (id: 1, type: ANIME) {
        id
        title {
          romaji
        }
      }
    }
    '''
    try:
        response = requests.post(url, json={'query': query}, timeout=10)
        if response.status_code == 200:
            print(f"AniList API is UP. Status Code: {response.status_code}")
            print(f"Data received: {response.json().get('data', {}).get('Media', {}).get('title', {}).get('romaji')}")
        else:
            print(f"AniList API returned error. Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Failed to connect to AniList API: {e}")

if __name__ == "__main__":
    check_anilist_api()
