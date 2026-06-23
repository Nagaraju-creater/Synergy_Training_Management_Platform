import urllib.request
import urllib.error
import json

def test_url(url):
    print(f"Requesting URL: {url}")
    try:
        with urllib.request.urlopen(url) as response:
            print("Status Code:", response.status)
            body = response.read().decode()
            print("Body (truncated):", body[:200])
    except urllib.error.HTTPError as e:
        print("HTTPError Code:", e.code)
        print("HTTPError Reason:", e.reason)
        print("HTTPError Body:", e.read().decode())
    except Exception as e:
        print("General Error:", e)
    print("-" * 50)

test_url('http://localhost:8000/api/v1/attendance/session-link/F0TXHE')
test_url('http://localhost:8000/api/v1/attendance/session-link/some-slug-name-F0TXHE')
