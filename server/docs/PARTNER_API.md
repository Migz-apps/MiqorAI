# Partner API

Read-only API for insurer partners, scoped to the insurer that owns the API key.

Base path: `/api/partner/v1`

## Authentication

Create and rotate API keys in the insurer portal (Settings → API keys). The raw
key (`miq_...`) is shown once at creation; only its hash is stored.

Send the key on every request in one of these headers:

```
X-Api-Key: miq_<key>
```

or

```
Authorization: ApiKey miq_<key>
```

Missing, unknown, revoked or rotated-out keys receive `401` with an error code
of `API_KEY_REQUIRED` or `API_KEY_INVALID`.

## Rate limiting

60 requests per minute per API key. Exceeding it returns `429` with a
`Retry-After` header.

## Endpoints

### GET /api/partner/v1/claims

Claims belonging to the key's insurer, newest first.

Query parameters:

| Parameter    | Type   | Description                                                        |
|--------------|--------|--------------------------------------------------------------------|
| `status`     | string | Filter by claim status: `pending`, `flagged`, `investigating`, `cleared` |
| `start_date` | date   | Only claims created on or after this date (ISO 8601)               |
| `end_date`   | date   | Only claims created on or before this date (ISO 8601)              |
| `limit`      | int    | Page size, 1–200 (default 50)                                      |
| `offset`     | int    | Rows to skip (default 0)                                           |

Response:

```json
{
  "items": [
    {
      "id": "…",
      "patient_id": "…",
      "provider_name": "Kigali Medical Center",
      "amount": 120.5,
      "status": "pending",
      "fraud_score": 12,
      "pattern": null,
      "created_at": "2026-10-01T08:12:00.000Z",
      "updated_at": "2026-10-01T08:12:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### GET /api/partner/v1/members

Enrolled members of the key's insurer, newest enrollment first.

Query parameters: `limit`, `offset` (as above).

Response:

```json
{
  "items": [
    {
      "id": "…",
      "member_number": "NHI-000123",
      "patient_id": "…",
      "name": "Grace Muthoni",
      "enrolled_at": "2025-03-14T00:00:00.000Z",
      "active": true
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

## Example

```sh
curl -H "X-Api-Key: miq_0123abcd..." \
  "https://api.example.com/api/partner/v1/claims?status=flagged&start_date=2026-01-01&limit=20"
```
