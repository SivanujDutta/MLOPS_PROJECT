import os
import json
import asyncio
from fastapi import FastAPI
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import ssl
import redis.asyncio as redis
from trainer import train_experiment, download_from_s3
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import psycopg2
import uuid

# Load environment variables
load_dotenv()

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL")
QUEUE_NAME = "ml_task_queue"

# Global Redis client
redis_client = None

# In-Memory Model Cache for ultra-fast predictions
loaded_models = {}

class PredictionRequest(BaseModel):
    deploymentId: str
    s3Url: str
    inputData: dict

async def ml_worker_loop():
    """
    Infinite loop that acts like Celery!
    It blocks (using 0 CPU) waiting for tasks to arrive in the Upstash Redis queue.
    """
    print(f"[*] ML Worker started! Listening on Redis queue: '{QUEUE_NAME}'")
    while True:
        try:
            # BRPOP blocks until a message is available in the list.
            # It returns a tuple: (queue_name, message)
            result = await redis_client.brpop(QUEUE_NAME, timeout=5)
            
            if result:
                _, message = result
                task_data = json.loads(message.decode("utf-8"))
                print(f"\nReceived New ML Task: {task_data['experimentId']}")
                print(f"Target Column: {task_data['targetColumn']} | Type: {task_data['taskType']}")
                
                # --- EXECUTE HEAVY ML TRAINING ---
                # Run the blocking ML training code in a separate thread so it doesn't block the async loop!
                print("Starting ML training pipeline...")
                await asyncio.to_thread(train_experiment, task_data)
                
                print(f"Finished processing Experiment {task_data['experimentId']}!")

        except asyncio.CancelledError:
            print(" Worker loop shutting down...")
            break
        except Exception as e:
            print(f" Worker loop error: {e}")
            await asyncio.sleep(5) # Prevent rapid failure loops

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Redis and start the background worker
    global redis_client
    redis_client = redis.from_url(REDIS_URL, ssl_cert_reqs=ssl.CERT_NONE)
    
    # Fire and forget the background task
    worker_task = asyncio.create_task(ml_worker_loop())
    
    yield
    
    # Shutdown: Clean up connections
    worker_task.cancel()
    await redis_client.close()

app = FastAPI(
    title="MLOps Worker API",
    description="Python backend for processing Machine Learning tasks.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    """
    Simple health check endpoint to verify the worker is alive.
    """
    return {"status": "ok", "message": "ML Worker is running!"}

@app.post("/internal/ml/predict")
async def predict(request: PredictionRequest):
    """
    Downloads the model from S3 (if not cached), runs inference, and logs to Postgres.
    """
    try:
        # 1. Load Model (with in-memory caching)
        if request.s3Url not in loaded_models:
            print(f"[*] Model not in cache. Downloading from S3...")
            local_path = f"/tmp/{uuid.uuid4()}.joblib" if os.name != 'nt' else f"{uuid.uuid4()}.joblib"
            
            # Download and Load
            await asyncio.to_thread(download_from_s3, request.s3Url, local_path)
            model = await asyncio.to_thread(joblib.load, local_path)
            
            loaded_models[request.s3Url] = model
            
            # Clean up disk
            if os.path.exists(local_path):
                os.remove(local_path)
            print(f"[*] Model loaded into RAM and cached!")
        
        model = loaded_models[request.s3Url]
        
        # 2. Run Inference
        df = pd.DataFrame([request.inputData])
        prediction = model.predict(df)[0]
        
        # Convert numpy types to native Python for JSON
        if isinstance(prediction, (np.integer, np.floating)):
            prediction = prediction.item()
            
        # 3. Log to Database
        def log_to_db():
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
            cur = conn.cursor()
            log_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO "PredictionLog" (id, "deploymentId", "inputData", "predictionOutput", "createdAt")
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (log_id, request.deploymentId, json.dumps(request.inputData), json.dumps({"prediction": prediction}))
            )
            conn.commit()
            cur.close()
            conn.close()
            
        await asyncio.to_thread(log_to_db)
        
        return {"prediction": prediction}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
