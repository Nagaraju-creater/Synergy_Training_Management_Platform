import urllib.request
import json
import sys

def test_nominate():
    url = "http://localhost:8000/api/v1/auth/login"
    data = {"email": "manager@trainiq.com", "password": "manager123"}
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            resp_json = json.loads(body)
            token = resp_json['data']['access_token']
            user_info = resp_json['data']['user']
            employee_id = user_info.get('employee', {}).get('id')
            print(f"Token acquired. Employee ID: {employee_id}")
    except Exception as e:
        print(f"Login Error: {e}")
        return

    # Now make the nomination
    nom_url = "http://localhost:8000/api/v1/nominations"
    nom_data = {
        "employee_id": employee_id,
        "training_id": "00000000-0000-0000-0000-000000000001",  # random UUID that likely doesn't exist, will cause FK violation
        "reason": "Because I need to learn this"
    }
    # Wait, FK violation will happen if training_id doesn't exist.
    # Let's get a real training_id
    train_url = "http://localhost:8000/api/v1/trainings"
    train_req = urllib.request.Request(train_url, headers={'Authorization': f'Bearer {token}'}, method="GET")
    try:
        with urllib.request.urlopen(train_req) as response:
            train_body = json.loads(response.read().decode('utf-8'))
            trainings = train_body['data']['items']
            if trainings:
                nom_data['training_id'] = trainings[0]['id']
            else:
                print("No trainings found!")
                return
    except Exception as e:
        print(f"Error fetching trainings: {e}")
        return

    nom_req = urllib.request.Request(nom_url, data=json.dumps(nom_data).encode(), headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }, method="POST")
    
    try:
        with urllib.request.urlopen(nom_req) as response:
            print("Nomination Response:")
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"Nomination HTTPError: {e.code}")
        print(e.read().decode('utf-8'))

if __name__ == "__main__":
    test_nominate()
