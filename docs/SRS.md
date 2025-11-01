# Software Requirements Specification (SRS) — oneToSevenMedia

Last updated: 2025-11-01

## 1. Purpose

This document describes the software requirements, architecture, data model, API surface, and step-by-step developer/run guides for the oneToSevenMedia project. It is intended for developers, product managers, and QA engineers to understand and work with the frontend (React + Vite) and backend (Node.js + Express + Mongoose).

## 2. Scope

oneToSevenMedia is a platform to manage brand campaigns and influencer orders. Key capabilities:

- Create and manage campaigns (admin/brand)
- Influencers browse campaigns and submit orders
- Admins review applications and orders with filters, export/import (CSV) and batch actions
- Payments pipeline: create Payment records on order approval; require influencer bank details for payouts
- Appeal flow for rejected orders
- Campaign-level comments (public/influencer-facing and internal admin-only notes)

This SRS documents functional and non-functional requirements, data model, API endpoints, frontend structure, developer setup, step-by-step workflows, and operational notes.

## 3. Definitions and acronyms

- Admin: Platform admin or brand user who can create campaigns and review orders.
- Influencer: User who applies to campaigns and submits orders.
- Campaign: A marketing brief created by a brand for influencers.
- Application: Influencer's application to a campaign; includes order data when fulfilled.
- Order: The order submitted by an influencer for a campaign (may include shipping/payout info).
- Payment: A record created when an order is approved; tracks payout to influencer.
- CSV round-trip: Export to CSV containing unique identifiers (applicationId) so that an imported CSV can map back to existing records.

## 4. Stakeholders

- Product owner / Brand managers
- Platform administrators
- Influencers
- Developers and QA

## 5. Functional Requirements (detailed)

5.1 Campaign management

- FR1: Admins can create, read, update, and delete campaigns.
- FR2: Campaigns include fields: title, brandName, category, followersMin, followersMax, location, budget, deliverables, fulfillmentMethod, orderFormFields, isPublic, paymentType, influencerComment, adminComment.
- FR3: Admins can set an influencer-facing note (`influencerComment`) and an internal admin-only note (`adminComment`) during create/edit and bulk create.

  5.2 Applications and Orders

- FR4: Influencers can apply to campaigns; when `fulfillmentMethod` uses influencer ordering, they submit an order with form fields.
- FR5: Applications and orders are retained in the admin lists even after approval/rejection while the campaign exists.

  5.3 Admin review dashboard

- FR6: Admin Order Reviews should have the same UX and behavior as Applications Review: filters, export, import, field selection, and batch actions (approve/reject/assign/etc.).
- FR7: CSV export must include unique applicationId to allow round-trip imports.
- FR8: CSV import must gracefully map common header variants and update the corresponding records (approve/reject) and create Payment records on approve.

  5.4 Payments pipeline

- FR9: When an order is approved, a Payment record must be created. The Payment should include a snapshot of payout info (amount, influencerId, applicationId, campaignId, paymentType) and initial status `pending`.
- FR10: Influencers must provide bank details (bankAccountName, bankAccountNumber, bankName, bankIFSC) to be eligible for payout creation/submission. Order approval may still create Payment records, but payouts cannot be transferred without bank details (business rule can enforce blocking actual bank transfers).

  5.5 Appeals and notifications

- FR11: When an order is rejected, the system must mark the Application with `needsAppeal: true` and an `appealFormName` if applicable. The influencer receives an in-app notification and may resubmit an appeal.
- FR12: Appeals are labeled in application history and the admin review dashboard must surface appeals.

  5.6 Bulk CSV handling

- FR13: Admins can upload CSVs to bulk approve/reject orders. The import process must:
  - Accept multiple header variants for common fields (e.g., applicationId, application_id, id)
  - Normalize status values (approve/approved/A, reject/rejected/R) with case-insensitive matching
  - Report a per-row result (success, skipped, error) and not fail the entire import due to a few bad rows

## 6. Non-Functional Requirements

- NFR1: Component renders should be responsive and mobile-friendly.
- NFR2: CSV imports should process moderately large files (up to a few thousand rows) without blocking the server — consider streaming or background jobs for larger sizes.
- NFR3: Sensitive fields (bank details, adminComment) must not be exposed to influencers or public APIs.
- NFR4: API endpoints should require authentication using JWT tokens.
- NFR5: Log important errors and validation failures for troubleshooting.

## 7. Data Model (Mongoose summaries)

7.1 User

- Fields: \_id, name, email, passwordHash, role, bankAccountName, bankAccountNumber, bankName, bankIFSC, notifications[]
- Notes: Notifications are small in-app objects to show events like rejects/appeals.

  7.2 Campaign

- Fields: \_id, title, brandName, category, followersMin, followersMax, location, budget, deliverables[], fulfillmentMethod, orderFormFields[], isPublic (boolean), paymentType, influencerComment (string), adminComment (string)

  7.3 Application

- Fields: \_id, campaignId, influencerId (user), status, orderData (object from order form), payout (number/amount), needsAppeal (boolean), appealFormName (string), createdAt, updatedAt

  7.4 Payment

- Fields: \_id, applicationId, campaignId, influencerId, amount, paymentType, status (pending/paid/failed), createdAt, metadata

  7.5 RefreshToken (optional)

- Standard refresh token schema for long-lived sessions.

## 8. API Endpoints (top-level)

Note: All `/api` paths are relative to server root.

8.1 Auth

- POST /api/auth/login — body: { email, password } -> returns { token, refreshToken }
- POST /api/auth/refresh — body: { refreshToken } -> returns new token

  8.2 Campaigns

- GET /api/campaigns — public list (supports filters like category, public only)
- GET /api/campaigns/:id — return a single campaign (include influencerComment if public or user authorized; adminComment returned to admin role only)
- POST /api/campaigns — Admin (auth required) — create campaign. Accepts influencerComment and adminComment in body.
- PATCH /api/campaigns/:id — Admin — update campaign; accepts influencerComment and adminComment.
- POST /api/campaigns/bulk-create — Admin — CSV/JSON bulk create (server supports mapping of influencerComment/adminComment columns)

  8.3 Applications / Orders

- POST /api/applications — influencer submits application/order
- POST /api/applications/:id/order/approve — Admin approve; creates Payment record
- POST /api/applications/:id/order/reject — Admin reject; sets needsAppeal and notifies influencer
- POST /api/applications/bulk-order-review — Admin CSV import endpoint to approve/reject many orders (supports flexible header mapping)

  8.4 Payments

- GET /api/payments — Admin list
- GET /api/payments/me — Influencer payments
- PATCH /api/payments/:id — update (e.g., mark paid)

  8.5 Users

- GET /api/users/me — get profile
- PATCH /api/users/me — update profile including bank fields

## 9. CSV Handling and Normalization Rules (appendix-level details)

9.1 Header mapping

- The CSV import accepts multiple header variants. Recommended map rules (examples):
  - applicationId -> applicationId | application_id | id
  - status -> status | state | action
  - campaignId -> campaignId | campaign_id | campaign
  - payout -> payout | amount | pay
  - influencer -> influencer | influencer_id | userId
- The server code includes a `mapRowKeys` helper to normalize keys from various CSVs.

  9.2 Status normalization

- Accepted status values for approve: approve, approved, a, accepted
- Accepted status values for reject: reject, rejected, r, declined
- Matching is case-insensitive and whitespace-tolerant.

  9.3 Round-trip export

- When exporting to CSV for offline review/edit, include `applicationId` and other stable identifiers so that importing the edited CSV can map rows back to existing records.

## 10. Frontend Structure (client)

Layout of important files/folders (relative to `client/`):

- `src/` — main app source
  - `components/` — reusable UI components (CampaignCard, OrderModal, Header, Footer, Button, etc.)
  - `pages/` — route pages (CreateCampaign.jsx, CampaignEdit.jsx, AdminOrderReviews.jsx, AdminApplicationsOverview.jsx, AdminPayments.jsx, InfluencerDashboard.jsx, ProfileNew.jsx)
  - `context/` — React contexts (AuthContext, ToastContext)
  - `constants/` — small consts (adminPermissions, socialPlatforms)

Key UI behaviors implemented:

- `AdminOrderReviews.jsx` — CSV export/import, field chooser, batch actions.
- `OrderModal.jsx` — shows order details, checks influencer bank details and shows appeal UI when appropriate.
- `CampaignCard.jsx` — renders influencerComment (public) and adminComment (admin only) and shows a Live badge when `isPublic`.

## 11. Developer setup and run (Windows PowerShell)

Prerequisites

- Node.js (16+ recommended)
- npm (comes with Node) or pnpm if you prefer
- MongoDB running locally or a connection string to a cloud MongoDB
- Optional: Redis if you add caching or job queues

Environment variables (example `.env` for server)

- PORT=4000
- MONGODB_URI=mongodb://localhost:27017/onesev
- JWT_SECRET=replace_with_a_secret
- NODE_ENV=development

Install & run client

```powershell
cd client; npm install
npm run dev
```

Install & run server

```powershell
cd server; npm install
# ensure you have .env in server/ with MONGODB_URI and JWT_SECRET
npm run dev
```

Run tests

```powershell
# From repo root or test folder depending on your test runner
npm test
```

If the server fails to start with exit code 1, inspect the server logs and ensure MongoDB is reachable and environment vars (JWT secret) are set.

## 12. Step-by-step workflows (operational guides)

12.1 Create a campaign (admin)

1. Visit Admin → Create Campaign in the app.
2. Fill in Title, Brand name, Category, Budget, Deliverables, and Order form fields.
3. Optional: Add a short influencer-facing note in "Public note for creators (influencer-facing)" — this will appear on campaign cards.
4. Optional: Add an internal admin note in "Internal admin note (admin-only)" — visible only to admins.
5. Click Create. Verify the campaign appears in Admin → Campaigns.

   12.2 Bulk-create campaigns via CSV (admin)

6. Prepare CSV with headers such as title, brandName, category, budget, influencerComment, adminComment.
7. Upload via the admin bulk-create endpoint or the UI (if implemented).
8. Server will map common header variants (e.g., influencer_comment) to the expected fields.
9. Verify created campaigns in Admin UI.

   12.3 Export orders for review

10. On Admin → Order Reviews, use Export to produce a CSV including `applicationId` plus order details (order form fields, payout, influencerId, campaignId).
11. Share the CSV with reviewers.

    12.4 Import reviewed CSV and perform batch actions

12. Ensure the CSV contains applicationId to map to existing records.
13. Upload in Admin → Order Reviews import. The import will normalize headers and status values.
14. Rows with status 'approve' will cause the server to create Payment records (snapshot payout info). Rows with status 'reject' will mark `needsAppeal` and notify the influencer.
15. Review the import result summary and correct any rows that failed.

    12.5 Approve single order (admin)

16. Open an application/order in the admin modal.
17. Verify influencer bank details are present (ProfileNew contains bank fields). If absent, prompt influencer to add bank details.
18. Click Approve. The server will:

    - Change application status to approved
    - Create a Payment record (status: pending)
    - Leave the application record present (not delete)

    12.6 Reject single order (admin)

19. Open application/order and choose Reject.
20. Provide reject notes if required.
21. Server will set `needsAppeal: true` and push an in-app notification to the influencer.
22. Influencer can resubmit an appeal via the application form (the UI should label it as an appeal submission).

## 13. Testing strategy

- Unit tests: test controllers and helpers (`normalizeStatus`, `mapRowKeys`) using Jest or Mocha. Keep mocking of Mongoose models.
- Integration tests: bring up a test MongoDB instance (in-memory MongoDB) and test CSV import endpoints and Payment creation flows.
- E2E: optional Selenium/Playwright flows for key UI behaviors (order submission, admin review, CSV export/import).

## 14. Security and Privacy

- Store bank details securely; consider encrypting bank fields at rest or leaving them out of logs.
- Ensure `adminComment` is not returned in public API endpoints; only admin roles should see it.
- Protect endpoints with JWT and RBAC middleware.

## 15. Deployment notes

- Build client for production: `cd client; npm run build` and serve `dist/` from a static host or via the server.
- Server: run with `NODE_ENV=production` and a process manager (PM2/forever/systemd) and a configured MongoDB instance.
- Add monitoring/alerting for CSV import failures and payment pipeline errors.

## 16. Future improvements

- Move CSV import/export to background jobs (e.g., using Bull + Redis) for large files.
- Add email notifications for appeals/rejections in addition to in-app notifications.
- Add audit trail for admin actions (who approved/rejected and when).
- Add data validation and stronger typing (TypeScript server + client) and expand unit/integration tests.

## 17. Appendix — sample payloads

Create campaign (POST /api/campaigns)

```json
{
  "title": "Summer Fitness Promo",
  "brandName": "Acme Co",
  "category": "Fitness",
  "budget": 500,
  "isPublic": true,
  "influencerComment": "Please mention hashtag #AcmeFit",
  "adminComment": "Priority campaign — high exposure"
}
```

Approve application (POST /api/applications/:id/order/approve)
Request: empty body (authorization header required)
Response (200):

```json
{ "ok": true, "paymentId": "...", "applicationId": "..." }
```

Bulk CSV import (POST /api/applications/bulk-order-review)

- Accepts multipart/form-data `file` and/or JSON body as convenience.
- Response: per-row status array with rowIndex, inputRow, result { success: boolean, message: "..." }

---

## Contact and maintenance

For questions about architecture or to request changes or new features, open an issue in the repository or contact the maintainers.

---

End of SRS
