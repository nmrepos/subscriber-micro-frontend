import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// Create a resource with service information
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'subscriber-micro-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'frontend',
});

// Create the tracer provider with resource
const provider = new WebTracerProvider({
  resource: resource,
});

// Create the OTLP exporter
const exporter = new OTLPTraceExporter({
  url: 'https://otel.nidhun.me/v1/traces',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Use BatchSpanProcessor for better performance
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

// Register the provider
provider.register();

// Register auto-instrumentations
registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Not available in browser
      },
    }),
  ],
});
