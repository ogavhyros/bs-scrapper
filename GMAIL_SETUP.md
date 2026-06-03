# Setting up Gmail for password reset emails

## Steps

1. Use a Gmail account (can be your existing one)
2. Go to **Google Account → Security**
3. Enable **2-Step Verification** (required for app passwords)
4. Go to **Security → App passwords**
5. Select **Mail** and **Windows Computer** (or any device)
6. Copy the 16-character app password
7. Add to **Render environment variables**:

| Variable | Value |
|---|---|
| `EMAIL_USER` | your.email@gmail.com |
| `EMAIL_PASS` | the 16-char app password (no spaces) |
| `FRONTEND_URL` | https://bs-scrapper-ivory.vercel.app |

## After adding env vars

1. Click **Manual Deploy** on Render so the new variables take effect
2. Test by clicking "Forgot password?" on the login page

## Notes

- The reset link expires in **1 hour**
- If `EMAIL_USER` / `EMAIL_PASS` are not set, the token is still saved to the DB — the email just won't send (useful for local dev)
- The debug endpoint `GET /api/auth/debug` shows the users table schema and count (remove this once confirmed working)
