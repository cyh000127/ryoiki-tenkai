FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml ./
COPY alembic.ini ./
COPY migrations ./migrations
COPY src ./src

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "gesture_api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
