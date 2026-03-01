# PLAN

## Mission
- Build the IKEA staff product finder that stays usable offline by routing all reads through Couchbase, powered by the Bluetext + Polytone stack.

## Current focus
1. Revisit the services/react-web-app, models, and clients setup so everyone understands how Polytope runs the stack and wires into Couchbase.
2. Generate the initial IKEA inventory dataset with the Metabase dataset-generator and load it into Couchbase so the app has local data on startup.
3. Define the Couchbase offline caching flow and outline the staff scan UI that shows shelf locations and online/offline status.

## Next steps
- Seed the Couchbase bucket with the generated dataset and confirm reads work while offline.
- Build the staff-facing React Router route that lets staff scan products, validates their shelf location, and clearly surfaces connectivity state.
- Document the rollout plan for BLE positioning, AR navigation, and edge AI integration once the staff experience is stable.
