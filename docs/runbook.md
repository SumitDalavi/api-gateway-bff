# Runbook: api-gateway-bff

## Exact Startup
```bash
npm install || pip install -r requirements.txt
npm run start || python main.py
```

## Testing
```bash
npm run test || pytest
```

## Health Check
- **Endpoint**: `/health` or `GET /`
- **Expected Response**: HTTP 200 OK with `status: healthy`.

## Failure Symptom
- Service returns `503 Service Unavailable` or connection refused.
- Logs indicate missing environment variables or port binding conflicts.

## Diagnosis
1. Check if the port is already in use using `lsof -i:<port>`.
2. Ensure dependencies are correctly mocked in `.env`.

## Recovery
1. Terminate the conflicting process.
2. Restart the application using the startup command.

## Teardown
```bash
# Send SIGINT (Ctrl+C) to the running process
kill -9 <PID>
```
