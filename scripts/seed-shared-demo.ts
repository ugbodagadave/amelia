const DEMO_SHARED_ACCOUNT_EMAIL = process.env.DEMO_SHARED_ACCOUNT_EMAIL ?? "esther@getamelia.online"
const DEMO_WORKSPACE_ADMIN_SECRET = process.env.DEMO_WORKSPACE_ADMIN_SECRET

if (!DEMO_WORKSPACE_ADMIN_SECRET) {
  throw new Error("DEMO_WORKSPACE_ADMIN_SECRET must be set before running the shared demo seed.")
}

const args = JSON.stringify({
  adminSecret: DEMO_WORKSPACE_ADMIN_SECRET,
  email: DEMO_SHARED_ACCOUNT_EMAIL,
})

const command = ["bunx", "convex", "run", "--prod", "demo:seedSharedClinicWorkspace", args]
const subprocess = Bun.spawn(command, {
  cwd: globalThis.process.cwd(),
  stdout: "pipe",
  stderr: "pipe",
})

const [stdout, stderr, exitCode] = await Promise.all([
  new Response(subprocess.stdout).text(),
  new Response(subprocess.stderr).text(),
  subprocess.exited,
])

if (exitCode !== 0) {
  throw new Error(stderr || stdout || `Shared demo seed failed with exit code ${exitCode}.`)
}

console.log(stdout.trim())
