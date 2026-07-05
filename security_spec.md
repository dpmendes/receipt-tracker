# Security Specification: Fortress Security rules for ShopperReceipts

This document details the security specification, data invariants, and the "Dirty Dozen" malicious payloads designed to test the boundaries of our Firestore database security.

## 1. Data Invariants

1. **Identity Isolation**: A user can only read, write, update, or delete their own receipts and shopping list items. `resource.data.userId` or `incoming().userId` must strictly match `request.auth.uid`.
2. **Strict Structure**: Receipts must have valid keys, non-negative amounts, and non-empty shop names.
3. **Bounded Items**: The `items` array inside a receipt must not exceed 100 items to prevent Denial of Wallet storage-bloat attacks.
4. **Immutable UIDs**: A user cannot modify the `userId` field of an existing receipt or shopping list item (preventing hijacking).
5. **ID Poisoning Prevention**: Document IDs must be valid alphanumeric strings of length <= 128 to prevent junk-character buffer/indexing attacks.

---

## 2. The "Dirty Dozen" Payloads (PERMISSION_DENIED cases)

### Case 1: Receipt Spoofing (Unauthenticated Create)
Creating a receipt when not signed in.
```json
{
  "id": "rcpt_123",
  "userId": "user_abc",
  "shopName": "Padaria Real",
  "date": "2026-07-04",
  "totalAmount": 45.50,
  "status": "confirmed",
  "createdAt": 1783161600,
  "items": []
}
```

### Case 2: Identity Theft (Forged Owner ID)
Signed-in user `user_attacker` trying to create a receipt with `userId: "user_victim"`.
```json
{
  "id": "rcpt_124",
  "userId": "user_victim",
  "shopName": "Supermercado Extra",
  "date": "2026-07-04",
  "totalAmount": 120.00,
  "status": "confirmed",
  "createdAt": 1783161600,
  "items": []
}
```

### Case 3: Receipt Hijacking (Malicious Update)
Signed-in user `user_attacker` trying to read or edit `user_victim`'s receipt.
```json
// Attempting to read or update /receipts/victim_receipt
```

### Case 4: Owner Field Mutation (Privilege Escalation)
A user trying to change the `userId` of their own receipt to another user's ID.
```json
// Incoming resource with modified userId
```

### Case 5: Shadow Fields (Extraneous Keys)
Injecting a hidden administrative field `isAdminApproved: true` into the receipt schema.
```json
{
  "id": "rcpt_125",
  "userId": "user_abc",
  "shopName": "Açougue Prime",
  "date": "2026-07-04",
  "totalAmount": 89.90,
  "status": "confirmed",
  "createdAt": 1783161600,
  "items": [],
  "isAdminApproved": true
}
```

### Case 6: Negative Pricing (Financial Integrity Breach)
Creating a receipt with a negative price or total amount.
```json
{
  "id": "rcpt_126",
  "userId": "user_abc",
  "shopName": "Açougue Prime",
  "date": "2026-07-04",
  "totalAmount": -50.00,
  "status": "confirmed",
  "createdAt": 1783161600,
  "items": []
}
```

### Case 7: Bounded Array Attack (Denial of Wallet Storage Bloat)
Adding an items array of length 200 (over the 100 limit).
```json
{
  "id": "rcpt_127",
  "userId": "user_abc",
  "shopName": "Carrefour",
  "date": "2026-07-04",
  "totalAmount": 1000.00,
  "status": "confirmed",
  "createdAt": 1783161600,
  "items": [ /* 105 identical item maps */ ]
}
```

### Case 8: ID Poisoning (Malicious Path Parameter)
Attempting to create a receipt with a document ID containing special injection characters or extremely long string.
```json
// Path: /receipts/rcpt_$$$__long_junk_payload_$$$
```

### Case 9: Invalid Status Injection
Attempting to write a receipt with a custom status `archived_by_hacker`.
```json
{
  "id": "rcpt_128",
  "userId": "user_abc",
  "shopName": "Carrefour",
  "date": "2026-07-04",
  "totalAmount": 150.00,
  "status": "archived_by_hacker",
  "createdAt": 1783161600,
  "items": []
}
```

### Case 10: Shopping List Forged Owner
Signed-in user `user_attacker` attempting to write a shopping list item for `user_victim`.
```json
{
  "id": "item_999",
  "userId": "user_victim",
  "name": "Pão de Queijo",
  "status": "pending",
  "createdAt": 1783161600
}
```

### Case 11: Shopping List Item Name Bloat (DoS)
Attempting to create a shopping list item with a name of 10,000 characters.
```json
{
  "id": "item_100",
  "userId": "user_abc",
  "name": "A...[10,000 chars]...",
  "status": "pending",
  "createdAt": 1783161600
}
```

### Case 12: Terminal State Bypass
Attempting to modify a receipt that was already marked as `confirmed`.
```json
// Changing shopName on a receipt where existing().status == "confirmed"
```
