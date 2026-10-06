import requests
import json
import time

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
# Replace this with one of the API keys you just generated
API_KEY = "YOUR_API_KEY_HERE"

# Replace 'salary-model' with your actual endpoint slug
ENDPOINT_URL = "http://localhost:3000/api/deployments/s/predict"

def get_salary_prediction(years_experience):
    """
    Calls the NexusML API to get a salary prediction.
    """
    print(f"[*] Sending {years_experience} Years of Experience to NexusML...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    payload = {
        "inputData": {
            "YearsExperience": years_experience
        }
    }
    
    start_time = time.time()
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(ENDPOINT_URL, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            latency = round((time.time() - start_time) * 1000)
            
            prediction = data.get("prediction")
            print(f"[+] Success! Predicted Salary: ${prediction:,.2f} (took {latency}ms)")
            return
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                print(f"[-] Database might be sleeping. Retrying in 3 seconds... (Attempt {attempt+1}/{max_retries})")
                time.sleep(3)
            else:
                print(f"[-] API Request Failed after {max_retries} attempts: {e}")
                if response and hasattr(response, 'text') and response.text:
                    print(f"[-] Error details: {response.text}")

if __name__ == "__main__":
    print("--- NexusML External App Example ---")
    
    # Example 1: New Grad
    get_salary_prediction(1.3)
    
    # Example 2: Mid-Level
    get_salary_prediction(5.0)
    
    # Example 3: Senior
    get_salary_prediction(10.5)
