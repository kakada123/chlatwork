# Saved Creator generations

Recent generation cards open `/creator/history/:id` using the generation ID returned by the API, including video results. Each detail request uses the signed-in account and returns only a completed result owned by that account. Missing, foreign, and unsupported-script results are unavailable.

The detail endpoint loads a single result, so bookmarked links keep working after a result leaves the 30-entry recent list. Switching accounts or signing out clears recent previews and discards pending responses from the previous account.

Saved details show all sections and copy controls, plus an SRT download when available. Generation and editing actions remain on the original tool pages. No database changes or new environment variables are needed for history details.
