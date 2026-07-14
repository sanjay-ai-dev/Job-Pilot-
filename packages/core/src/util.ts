/** sha256(lower(company|title|city)) — the jobs.dedupe_hash rule (§4).
 *  Pure-JS so the exact same hashing runs in the browser demo and the node
 *  worker (no node:crypto dependency in the client bundle). */
export function dedupeHash(company: string, title: string, city: string): string {
  const key = `${company}|${title}|${city}`.toLowerCase().trim();
  return sha256Hex(key);
}

/** Minimal synchronous, isomorphic SHA-256 (hex). */
function sha256Hex(ascii: string): string {
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    const c = ascii.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  const l = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((l / 2 ** (i * 8)) & 0xff);

  const w = new Array<number>(64);
  for (let j = 0; j < bytes.length; j += 64) {
    for (let i = 0; i < 16; i++)
      w[i] = (bytes[j + i * 4]! << 24) | (bytes[j + i * 4 + 1]! << 16) | (bytes[j + i * 4 + 2]! << 8) | bytes[j + i * 4 + 3]!;
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]!) ^ rotr(18, w[i - 15]!) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(17, w[i - 2]!) ^ rotr(19, w[i - 2]!) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e!) ^ rotr(11, e!) ^ rotr(25, e!);
      const ch = (e! & f!) ^ (~e! & g!);
      const t1 = (h! + S1 + ch + K[i]! + w[i]!) | 0;
      const S0 = rotr(2, a!) ^ rotr(13, a!) ^ rotr(22, a!);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d! + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0]! + a!) | 0; H[1] = (H[1]! + b!) | 0; H[2] = (H[2]! + c!) | 0; H[3] = (H[3]! + d!) | 0;
    H[4] = (H[4]! + e!) | 0; H[5] = (H[5]! + f!) | 0; H[6] = (H[6]! + g!) | 0; H[7] = (H[7]! + h!) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

/** Parse loose "posted" strings ("3 days ago") to an ISO timestamp (§5). */
export function resolvePostedAt(
  raw: string | number | Date | null | undefined,
  now = new Date(),
): { postedAt: string; estimated: boolean } {
  if (raw == null) return { postedAt: now.toISOString(), estimated: true };
  if (raw instanceof Date) return { postedAt: raw.toISOString(), estimated: false };
  if (typeof raw === "number") {
    // epoch seconds or ms
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return { postedAt: new Date(ms).toISOString(), estimated: false };
  }
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return { postedAt: new Date(iso).toISOString(), estimated: false };

  const m = raw.match(/(\d+)\s*(hour|day|week|month)/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2]!.toLowerCase();
    const mult = unit === "hour" ? 3.6e6 : unit === "day" ? 8.64e7 : unit === "week" ? 6.048e8 : 2.592e9;
    return { postedAt: new Date(now.getTime() - n * mult).toISOString(), estimated: true };
  }
  return { postedAt: now.toISOString(), estimated: true };
}

/** Best-effort salary → LPA (lakhs per annum) conversion (§5). */
export function toLpa(
  amount: number | null | undefined,
  period: "year" | "month" | "hour" = "year",
  currency = "INR",
): number | null {
  if (amount == null || Number.isNaN(amount)) return null;
  const inr = currency === "USD" ? amount * 83 : currency === "EUR" ? amount * 90 : amount;
  const annual = period === "month" ? inr * 12 : period === "hour" ? inr * 2080 : inr;
  return Math.round((annual / 1e5) * 10) / 10;
}
