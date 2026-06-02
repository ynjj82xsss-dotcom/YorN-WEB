# Security Specification for YorN AI Chat (Firestore Rules TDD)

This document outlines the security specifications and validation rules governing the Firestore data collections for the YorN AI Chat application.

## 1. Data Invariants
- **Session Ownership**: A `session` document belongs strictly to its creator, validated by comparing the `userId` field to the authenticated user's `request.auth.uid`.
- **Relational Integrity**: A `message` document can only be written to `/sessions/{sessionId}/messages/{messageId}` if the authenticated user is the legitimate owner/creator of the parent `session` document.
- **Strict Role Boundaries**: Only standard, legitimate fields can be updated. System fields or fields belonging to other elements must not be modified by standard users.
- **Temporal Enforcement**: Timestamps (if write-time validated) must align with the server time or valid UTC formats, and document owner fields are immutable once generated.

## 2. The "Dirty Dozen" Malicious Payloads (Vulnerability Cases)
1. **Unsigned-In Create/Read**: Anonymous or unsigned-in user attempts to create a session or read sessions.
2. **Session Hijacking (Read)**: User `A` tries to read a session owned by User `B`.
3. **Session Hijacking (Write)**: User `A` tries to write (create, update, or delete) a session owned by User `B`.
4. **Owner Impersonation (Spoofing)**: User `A` creates a session but sets `userId` to `user_B_id`.
5. **Path Poisoning via ID**: Injecting non-alphanumeric, giant, or harmful character payloads (e.g., `../sessions/..`) as a `sessionId`.
6. **Orphaned Message Write**: Writing a message directly into a session structure that does not exist or that belongs to someone else.
7. **Bypassing Fields Validation**: Sending excess fields or non-string inputs into `title` or `content` to overflow or brick the database.
8. **Immutability Breach**: Updating `userId` or `createdAt` on an existing session to swap its ownership.
9. **Role Modification/RBAC Spoofing**: Attempting to supply administrative parameters or system metadata fields on a profile or session document without authority.
10. **State Shortcutting**: Skipping authentication validation processes by bypassing client limits and trying to post a message with user role as 'assistant' to emulate assistant replies directly.
11. **PII Leak Exposure**: Attempting to read another user's sessions to scrape details via unsecured listings.
12. **Denial of Wallet (Giant String Bomb)**: Sending a massive 1MB string inside `title` to exceed storage limits and cause performance exhaustion.

## 3. Security Assertions Plan
We will design rules to block every one of these exploits. Only authenticated users with matching UIDs can perform any operations, and operations on messages will rely on parent session identity verification.
