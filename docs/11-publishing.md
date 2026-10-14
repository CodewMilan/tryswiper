# Export and manual sharing

Updated 14 October 2026. The user reviews a saved carousel, opens Export, checks it, and downloads PNG, PDF or Pro JPG. The user uploads the files to the social platform. Swiper does not connect social accounts, post automatically, schedule posts or retrieve social performance.

Checking is available to all plans. Native text metrics, structural validation and uploaded-image decoding flag known defects. Copy checks are heuristics; the user verifies claims and visual quality. Missing or corrupt images fail export explicitly. Preview and export use the same supported visual contract.

Exports can be pinned to a saved version. A stale version returns a conflict. Downloading binary files spends one export allowance; obtaining metadata or downloading JSON does not. MCP clients can retrieve authenticated bytes through a version-bound resource without inserting a key into a download URL.

## Legacy preparation compatibility

The separate browser Prepare files action was merged into Export by the operator's decision. Older API clients can still call `/api/v1/carousels/{id}/publish`; this creates an internal manual preparation record, not a social post or cached delivery package.

Each record binds the checked document version. Edits and undo invalidate approval. An identical retry is recognized before another allowance check; changed content needs a fresh key and validation. Final approval checks the version atomically. Returned download URLs include `version`. Unversioned legacy records cannot authorize changed content.

Future direct publishing would require a separate product decision, official platform integrations and approval/credential policies. It is outside the current repair scope.
