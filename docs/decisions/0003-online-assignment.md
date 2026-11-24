# 0003 · Assign website leads to whoever is online

**Decision:** a new website form lead goes to a user whose CRM tab sent a heartbeat (`GET /auth/me`) in the last 5 minutes. With several online, the user whose last assigned lead is oldest goes next (round-robin). With nobody online, it goes to the organization's default owner, then to the first admin.

**Details**
- Admins and Sales users both count as online.
- The heartbeat only runs while the tab is visible, so a background tab does not attract leads forever.
- Duplicates keep their existing owner.
- The lead's timeline records the owner and the reason (online or default).

**Later (v0.2):** rules by market, workload and working hours.
