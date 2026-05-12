# Spartan CRM Department App

Separated static files:

- `index.html`
- `styles.css`
- `script.js`
- `environment.js`
- `.env.example`

## Default login accounts

- Username: `spartan_chard` / Password: `123` / Role: Super Admin
- Username: `spartan_keith` / Password: `123` / Role: Super Admin

## CRM Member account creation

Super Admin users can go to **CRM Members** and create a member with:

- Member name
- Status
- Account username
- Account password
- Access role: `Viewer` or `Super Admin`

Created member accounts are saved in browser `localStorage` and can be used on the login screen while the member status is Active.

## Important security note

This is still a static front-end app. `environment.js` and browser `localStorage` are visible to users. For production, login/account management should be moved to a backend with proper password hashing and database storage.

## Run with Python

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the local server:

```bash
python main.py
```

3. Open the app in your browser:

```text
http://localhost:5000
```

## GitHub Push Basic Commands

```bash
git init
git add .
git commit -m "Initial CRM web app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
