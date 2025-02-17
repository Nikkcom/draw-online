FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

CMD ["python", "./app.py"]

# docker run -d --rm -p 8002:8002 --env PORT=8002 --name draw-online-backend draw-online-backend