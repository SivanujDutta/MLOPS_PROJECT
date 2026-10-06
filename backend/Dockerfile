FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (required for psycopg2 and some ML libraries)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start FastAPI and the background worker
CMD ["python", "main.py"]
