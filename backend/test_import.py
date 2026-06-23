import httpx

def test_import():
    # Write a test CSV
    with open("test.csv", "w") as f:
        f.write("employee_code,first_name,last_name,email\n")
        f.write("EMP999,John,Doe,john@doe.com\n")
        f.write("EMP999,John,Doe,john@doe.com\n")
    
    with httpx.Client(base_url="http://127.0.0.1:8000/api/v1") as client:
        # Login
        r = client.post("/auth/login", json={"email": "admin@trainiq.com", "password": "admin123"})
        if r.status_code != 200:
            print("Login failed:", r.text)
            return
        
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Import
        with open("test.csv", "rb") as f:
            files = {"file": ("test.csv", f, "text/csv")}
            r = client.post("/employees/import", files=files, headers=headers)
            
        print("Status Code:", r.status_code)
        try:
            print("Response:", r.json())
        except:
            print("Response text:", r.text)

if __name__ == "__main__":
    test_import()
