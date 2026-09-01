# Legacy TechScoop migration chain (archived)

These are the 52 migrations from the TechScoop era, kept for reference against
databases that predate the BrentDesk baseline. The chain was NOT reproducible on
a fresh database (migration 0031 altered tables first created in 0035; 0041 was
orphaned from the journal; snapshots stopped at 0043), so BrentDesk starts from
a single squashed baseline generated from drizzle/schema.ts.

Do not add these back to the active journal.
