import { networkInterfaces } from "node:os"
import { execFileSync, spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

function isPrivateIpv4(address) {
  return (
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  )
}

function findLanAddress() {
  const candidates = Object.entries(networkInterfaces())
    .flatMap(([name, addresses]) =>
      (addresses ?? []).map((entry) => ({ name, ...entry }))
    )
    .filter(
      (entry) =>
        entry.family === "IPv4" &&
        !entry.internal &&
        isPrivateIpv4(entry.address)
    )
    .sort((left, right) => {
      const virtualPattern = /virtual|vethernet|wsl|docker|vmware|virtualbox/i
      return Number(virtualPattern.test(left.name)) - Number(virtualPattern.test(right.name))
    })

  return candidates[0]?.address
}

function findDefaultRouteAddress() {
  if (process.platform !== "win32") return undefined

  try {
    const command = [
      "Get-NetIPConfiguration",
      "| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' }",
      "| ForEach-Object { $_.IPv4Address.IPAddress }",
      "| Select-Object -First 1",
    ].join(" ")

    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { encoding: "utf8", windowsHide: true }
    ).trim() || undefined
  } catch {
    return undefined
  }
}

const host = process.env.MOBILE_HOST || findDefaultRouteAddress() || findLanAddress()

if (!host) {
  console.error("Không tìm thấy IPv4 mạng LAN. Hãy đặt MOBILE_HOST bằng IP Wi-Fi/LAN của máy.")
  console.error("PowerShell: $env:MOBILE_HOST='192.168.1.10'; npm run dev:mobile")
  process.exit(1)
}

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url))
const port = 3443
const child = spawn(
  process.execPath,
  [nextBin, "dev", "--hostname", host, "--port", String(port), "--experimental-https"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-mobile",
    },
  }
)

console.log(`\nMở trên điện thoại cùng Wi-Fi: https://${host}:${port}`)
console.log("Lần đầu, hãy tin cậy chứng chỉ phát triển trên điện thoại để trình duyệt cho phép camera.\n")

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
