# Mustang Splits

Cross country pace board for the Little Chute Mustangs. Up to 30 named stopwatches for athletes or groups, with workout plans that show where each runner should be versus where they are.

Installable on a phone as an app (PWA) and works offline at the course.

## Deploy
Pushing to `main` on GitHub deploys to Vercel automatically.

## Updating the app
1. Make changes (Claude Code reads `CLAUDE.md` for the rules).
2. Bump the version in `app.js` and `version.json`.
3. Commit and push. After Vercel finishes, open the app on the phone and tap Update when the banner appears.

## If something breaks
```
git revert HEAD --no-edit
git push
```
