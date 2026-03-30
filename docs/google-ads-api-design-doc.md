# Glid — Google Ads API Integration Design Document

## 1. Company Overview

**Company**: Glid  
**Website**: https://glid.studio  
**Contact**: hunzzang1126@gmail.com  

Glid is a full creative design platform for digital advertisers. Users create display banner ads, social media creatives, and other visual content using a drag-and-drop editor with AI design assistance.

## 2. API Usage Overview

### Purpose
We use the Google Ads API exclusively for **asset management** — uploading image assets (banner creatives) and text assets (headlines) from our platform to the user's Google Ads account.

### API Endpoints Used
- `customers/{customerId}/assets:mutate` — Upload image and text assets
- `customers:listAccessibleCustomers` — List customer IDs accessible to the authenticated user

### What We Do NOT Do
- We do NOT create, modify, or delete campaigns
- We do NOT manage ad groups, keywords, or bidding
- We do NOT access reporting or analytics data
- We do NOT modify account settings or billing

## 3. User Authentication Flow

1. User clicks "Connect Google Ads" in our platform settings
2. OAuth 2.0 redirect to Google consent screen
3. User grants permission for `adwords` scope
4. Authorization code exchanged for access/refresh tokens via server-side Edge Function
5. Tokens stored securely in Supabase database (encrypted at rest)
6. Refresh tokens used to maintain access without re-authentication

## 4. Data Flow Architecture

```
User creates banner in ACE Editor
    ↓
User clicks "Publish to Google Ads"
    ↓
Frontend renders banner to PNG (Canvas2D)
    ↓
PNG sent to server-side Edge Function
    ↓
Edge Function uploads to Google Ads API as Image Asset
    ↓
Optional: Headline text uploaded as Text Asset
    ↓
Asset resource name returned and stored in publish history
```

## 5. Data Handling & Privacy

- **OAuth Tokens**: Stored in Supabase with Row Level Security (RLS). Users can only read their own tokens.
- **Image Data**: Rendered client-side, sent to Google Ads API server-side. We do not store images on our servers beyond the upload transaction.
- **User Data**: We only access the user's email (for account identification) and Google Ads customer IDs.
- **Token Refresh**: Handled server-side. Old tokens are overwritten, never accumulated.
- **Account Deletion**: When a user deletes their Glid account, all stored OAuth tokens are deleted via CASCADE.

## 6. Rate Limiting & Error Handling

- Each publish operation is user-initiated (no batch or automated calls)
- We respect Google Ads API rate limits and implement exponential backoff
- Failed uploads are logged and reported to the user with actionable error messages
- We do not retry failed operations automatically without user consent

## 7. Technology Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth 2.0
- **Hosting**: Vercel

## 8. Compliance

- We comply with Google Ads API Terms of Service
- We comply with Google API Services User Data Policy
- We maintain a Privacy Policy accessible at our website
- We do not sell, share, or misuse user data or API access
