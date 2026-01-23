import requests
import json

try:
    print("Testing API endpoint...")
    r = requests.get('http://localhost:8000/api/projects/')
    print(f"Status Code: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        print(f"Response type: {type(data)}")
        print(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        if isinstance(data, dict) and 'results' in data:
            print(f"Number of projects: {len(data['results'])}")
            print("✅ Pagination is working!")
        elif isinstance(data, list):
            print(f"Number of projects: {len(data)}")
            print("⚠️ API returning array (old format)")
        else:
            print(f"Unexpected format: {data}")
    else:
        print(f"❌ Error: {r.status_code}")
        print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"❌ Exception: {e}")
