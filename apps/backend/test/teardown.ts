export default async function globalTeardown() {
  // Test DB runs on tmpfs — no cleanup needed, data is lost when container stops.
}
