from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import mysql.connector
import os
# OpenTelemetry imports
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry import trace



app = FastAPI()

# OpenTelemetry setup
trace.set_tracer_provider(TracerProvider())
otlp_exporter = OTLPSpanExporter(
    endpoint="https://otel.nidhun.me/v1/traces"
)
span_processor = BatchSpanProcessor(otlp_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)
FastAPIInstrumentor.instrument_app(app)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 # Database configuration (replace with your credentials)
DB_CONFIG = {
    "host": os.environ.get("DBHOST", "localhost"),
    "user": os.environ.get("DBUSER", "root"),
    "password": os.environ.get("DBPASS", "Secret5555"),
    "database": os.environ.get("DBNAME", "subscribers")
}

# Pydantic model for the data to be inserted
class Subscriber(BaseModel):
    name: str
    email: str | None = None


@app.post("/subscribers")
async def create_subscriber(subscriber: Subscriber):
    try:
        mydb = mysql.connector.connect(**DB_CONFIG)
        cursor = mydb.cursor()

        sql = "INSERT INTO subscriber (name, email) VALUES (%s, %s)"
        val = (subscriber.name, subscriber.email)
        cursor.execute(sql, val)

        mydb.commit()
        item_id = cursor.lastrowid # Get the ID of the newly inserted row

        cursor.close()
        mydb.close()

        return {"message": "Thanks for subscribing", "id": item_id, "item": subscriber.dict()}

    except mysql.connector.Error as err:
        return JSONResponse(
            status_code=500,
            content={"message": f"Database error: {err}"},
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Unhandled Exception: {e}"},
        )


app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")