# The Serret Vale table

Player app for **A Finding of Good Standing**: **[open the app](https://saturdaylim.github.io/vaela-table/)**. The DM posts every turn there; private letters arrive in each player's sealed inbox.

Install it on a phone: open the link, then **Share** and **Add to Home Screen** (iPhone), or **Install app** from the browser menu (Android).

## Every turn, newest first

- [Turn 2: Session 0, the paperwork](story/0002-session-0-the-paperwork.md)

## For the DM

`npm install`, then `npm run dev` for a local preview. `npm run seal` seals `private/` into `sealed/`; `npm run leak-check` must pass before every push. Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
