# Auth Endpoints

## /api/login/

**Method:** `POST`

**Request payload** (default Simple JWT fields):
```json
{
  "username": "<your username>",
  "password": "<your password>"
}
```

**Response payload** (now includes user data):
```json
{
  "access": "<jwt access token>",
  "refresh": "<jwt refresh token>",
  "user": {
    "id": 1,
    "name": "John Doe",
    "company_id": 3
  }
}
```
- `id` – user ID.
- `name` – full name (or username if no full name is set).
- `company_id` – the primary‑key of the company the user belongs to.

The mobile app can now read `company_id` directly from the login response without an extra request.

## /api/register/

Creates a new user and company, returning only `access` and `refresh` tokens (unchanged).

## /api/token/refresh/

Refreshes the access token using a valid refresh token (unchanged).

## /api/logout/

Blacklists the provided refresh token (unchanged).
