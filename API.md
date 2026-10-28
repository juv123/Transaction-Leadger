# API Documentation

Base URL: `http://localhost:3000`

All requests and responses are JSON.

Success response:

```json
{ "success": true, "data": { } }
```

Error response:

```json
{ "success": false, "message": "reason here" }
```

Status codes used: 200, 201, 400 (validation), 404 (not found), 409 (duplicate reference_id),
422 (insufficient balance), 500 (unexpected error).

## Create account

`POST /accounts`

```json
{ "name": "Asha" }
```

`name` is required. Balance always starts from 0 and `created_at` is set by the server, so
`balance` / `created_at` in the request body are ignored.

Response (201):

```json
{
  "success": true,
  "data": {
    "id": "0d184f61-4469-407b-abe6-a310cac36b10",
    "name": "Asha",
    "balance": 0,
    "created_at": "2026-10-28T06:10:04.217Z"
  }
}
```

Errors: 400 if name is missing or not a string.

## Get balance

`GET /accounts/:id/balance`

```json
{
  "success": true,
  "data": { "account_id": "0d184f61-4469-407b-abe6-a310cac36b10", "balance": 100 }
}
```

Errors: 404 if the account doesn't exist.

## Add transaction

`POST /accounts/:id/transactions`

```json
{
  "type": "credit",
  "amount": 100,
  "description": "salary",
  "reference_id": "ref-1"
}
```

- `type` - `credit` or `debit`
- `amount` - number, greater than 0
- `description` - optional string
- `reference_id` - required, must be unique within the account

A credit adds to the balance and a debit subtracts from it. A debit is rejected if the balance is not
enough. If the same `reference_id` is sent again for the same account, no new transaction is created
and the balance stays the same. Different accounts can use the same `reference_id`.

Response (201):

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "12900c97-009a-4aa4-8bb3-05698d910d16",
      "account_id": "0d184f61-4469-407b-abe6-a310cac36b10",
      "type": "credit",
      "amount": 100,
      "description": "salary",
      "reference_id": "ref-1",
      "created_at": "2026-10-28T06:10:25.438Z"
    },
    "balance": 100
  }
}
```

Errors:

- 400 - invalid type, invalid amount, missing reference_id, description not a string
- 404 - account not found
- 409 - duplicate reference_id. The existing transaction is returned in `data`
- 422 - insufficient balance. Current balance is returned in `data`

```json
{ "success": false, "message": "Insufficient balance", "data": { "balance": 100 } }
```

## Transaction history

`GET /accounts/:id/transactions`

Query params (all optional):

- `type` - `credit` or `debit`. Without it you get both
- `page` - default 1
- `limit` - default 10, max 100

Example: `GET /accounts/:id/transactions?type=debit&page=1&limit=5`

Latest transactions come first (sorted by `created_at`).

```json
{
  "success": true,
  "data": [
    {
      "id": "431048e3-40b6-40aa-b4bb-8e71394abce1",
      "account_id": "0d184f61-4469-407b-abe6-a310cac36b10",
      "type": "debit",
      "amount": 30,
      "description": null,
      "reference_id": "r3",
      "created_at": "2026-10-28T06:11:45.396Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 5,
    "total_records": 1,
    "total_pages": 1
  }
}
```

Errors: 400 for invalid type/page/limit, 404 if the account is not found.

## Transfer money

`POST /transfers`

```json
{
  "from_account_id": "7441e7ff-1e56-4a6b-884c-acf68b5dcd5b",
  "to_account_id": "256d84a3-ae93-42f1-a418-2f9e6494d256",
  "amount": 30,
  "reference_id": "tr-1",
  "description": "rent"
}
```

`description` is optional, the rest are required. This debits the sender and credits the receiver in a
single db transaction, so if anything fails neither balance changes. Both entries are saved with the
same `reference_id`.

Example: A has 100, B has 50. Transfer 30 from A to B -> A has 70, B has 80.

Response (201):

```json
{
  "success": true,
  "data": {
    "from": { "transaction": { }, "balance": 70 },
    "to": { "transaction": { }, "balance": 80 }
  }
}
```

Errors: 400 (missing fields, invalid amount, same account), 404 (sender or receiver not found),
409 (duplicate reference_id), 422 (insufficient balance).

## Trying it out with curl

Mac / Linux / Git Bash:

```
curl -X POST localhost:3000/accounts -H "Content-Type: application/json" -d '{"name":"Asha"}'
curl -X POST localhost:3000/accounts/<id>/transactions -H "Content-Type: application/json" -d '{"type":"credit","amount":100,"reference_id":"ref-1"}'
curl localhost:3000/accounts/<id>/balance
curl "localhost:3000/accounts/<id>/transactions?type=credit"
```

On Windows cmd use double quotes and escape the inner ones:

```
curl -X POST localhost:3000/accounts -H "Content-Type: application/json" -d "{\"name\":\"Asha\"}"
```
