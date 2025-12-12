import urllib.request
import json
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def test_login():
    url = f"{BASE_URL}/auth/login/"
    data = json.dumps({"username": "admin", "password": "admin"}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("[PASS] Login successful")
                return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"[FAIL] Login failed: {e.code} {e.read().decode()}")
        return None

def test_profile(access_token):
    url = f"{BASE_URL}/users/me/"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("[PASS] Profile fetch successful")
                print(json.loads(response.read().decode()))
    except urllib.error.HTTPError as e:
        print(f"[FAIL] Profile fetch failed: {e.code} {e.read().decode()}")

def test_projects(access_token):
    url = f"{BASE_URL}/projects/"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("[PASS] Projects fetch successful")
                print(json.loads(response.read().decode()))
    except urllib.error.HTTPError as e:
        print(f"[FAIL] Projects fetch failed: {e.code} {e.read().decode()}")

if __name__ == "__main__":
    print("Testing API...")
    tokens = test_login()
    if tokens:
        test_profile(tokens['access'])
        test_projects(tokens['access'])
