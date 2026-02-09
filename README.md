# Daylock Backend API

Node.js + Express backend for Daylock app.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Fill in your Supabase credentials:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (found in Settings > API)
- `SUPABASE_JWT_SECRET` - JWT secret (found in Settings > API > JWT Settings)

4. Start the server:
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/ensure` - Ensure profile exists

### Rooms
- `GET /api/rooms` - Get user's rooms
- `GET /api/rooms/admin` - Get rooms where user is admin
- `GET /api/rooms/:roomId` - Get single room
- `GET /api/rooms/:roomId/stats` - Get room with stats
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:roomId` - Update room
- `DELETE /api/rooms/:roomId` - Delete room

### Attendance
- `GET /api/attendance` - Get all user attendance
- `GET /api/attendance/room/:roomId` - Get room attendance
- `GET /api/attendance/room/:roomId/today` - Get today's status
- `GET /api/attendance/room/:roomId/stats` - Get room stats
- `POST /api/attendance/submit` - Submit proof
- `GET /api/attendance/pending` - Get pending proofs (admin)
- `GET /api/attendance/pending/:roomId` - Get room pending proofs
- `POST /api/attendance/:id/approve` - Approve proof
- `POST /api/attendance/:id/reject` - Reject proof

### Invites
- `GET /api/invites/code/:code` - Get invite by code
- `GET /api/invites/room/:roomId` - Get room invites
- `POST /api/invites` - Create invite
- `POST /api/invites/accept` - Accept invite
- `POST /api/invites/:id/revoke` - Revoke invite

### Rules
- `GET /api/rules/room/:roomId` - Get room rules
- `POST /api/rules` - Add rule
- `PUT /api/rules/:ruleId` - Update rule
- `POST /api/rules/:ruleId/toggle` - Toggle rule
- `DELETE /api/rules/:ruleId` - Delete rule

## Authentication

All endpoints (except `/api/health` and `/api/invites/code/:code`) require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

The frontend handles authentication via Supabase Auth and passes the token to backend requests.
