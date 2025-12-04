FROM python:3.11-slim

WORKDIR /app

# 安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY app ./app

# 啟動 FastAPI（不啟用 --reload，較像正式環境）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
