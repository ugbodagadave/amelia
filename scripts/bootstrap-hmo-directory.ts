const BOOTSTRAP_FUNCTION = "hmoDirectory:backfillSeedDirectoryForAllClinics"

async function main() {
  const command = ["bunx", "convex", "run", BOOTSTRAP_FUNCTION]
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
    throw new Error(
      stderr || stdout || `Convex bootstrap command failed with exit code ${exitCode}.`,
    )
  }

  console.log(stdout.trim())
}

await main()
