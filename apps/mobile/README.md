# Parking Ticket Pal - Mobile App

## Get Started

```bash
pnpm install
pnpm start
```

## Testing API Endpoints (Development Only)

Use the `X-Test-User-Id` header to test backend endpoints in Postman without authentication. Only works when `NODE_ENV=development`.

### Example: Generate Challenge Letter

```bash
POST http://localhost:3000/api/letters/generate

Headers:
  X-Test-User-Id: clxxx... # Your user ID from database

Body:
{
  "pcnNumber": "AB12345678",
  "challengeReason": "CONTRAVENTION_DID_NOT_OCCUR",
  "additionalDetails": "Optional details"
}
```

### Example: Generate Forms

```bash
POST http://localhost:3000/api/forms/te7

Headers:
  X-Test-User-Id: clxxx...

Body:
{
  "pcnNumber": "AB12345678"
}
```

Available endpoints: `/api/letters/generate`, `/api/forms/te7`, `/api/forms/te9`, `/api/forms/pe2`, `/api/forms/pe3`

**Note:** Production ignores `X-Test-User-Id` and requires proper authentication.
