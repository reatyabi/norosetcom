/**
 * ژنراتور ماتریس QR کد سبک و خالص بدون وابستگی خارجی.
 * قادر به تولید ماتریس QR برای URLهای n8l.ir.
 */

// جدول توان‌های Galois Field GF(256) برای محاسبات Reed-Solomon
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  const logX = LOG_TABLE[x] ?? 0;
  const logY = LOG_TABLE[y] ?? 0;
  return EXP_TABLE[logX + logY] ?? 0;
}

function polyMul(p1: number[], p2: number[]): number[] {
  const result: number[] = new Array<number>(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      const idx = i + j;
      const prev = result[idx] ?? 0;
      result[idx] = prev ^ gfMul(p1[i] ?? 0, p2[j] ?? 0);
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = polyMul(g, [1, EXP_TABLE[i] ?? 0]);
  }
  return g;
}

function rsCompute(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const msg: number[] = [...data, ...new Array<number>(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i] ?? 0;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        const idx = i + j;
        const prev = msg[idx] ?? 0;
        msg[idx] = prev ^ gfMul(gen[j] ?? 0, coef);
      }
    }
  }
  return msg.slice(data.length);
}

// ساخت ماتریس کد با الگوی استاندارد
export function generateQrMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  // نسخه ۳ (۲۹×۲۹)، ظرفیت بایت با تصحیح خطای M: ۴۴ بایت
  // نسخه ۴ (۳۳×۳۳)، ظرفیت بایت با تصحیح خطای M: ۶۴ بایت
  let version = 3;
  let totalDataBytes = 44;
  let ecBytes = 26;

  if (utf8.length > 32) {
    version = 4;
    totalDataBytes = 64;
    ecBytes = 36;
  }

  const size = 17 + 4 * version;
  const matrix: Array<Array<boolean | null>> = Array.from({ length: size }, () =>
    new Array<boolean | null>(size).fill(null),
  );

  // رسم Finder Patterns (گوشه‌ها)
  function drawFinder(r: number, c: number) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const row = r + i;
        const col = c + j;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const inOuter = i === 0 || i === 6 || j === 0 || j === 6;
        const inInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        const targetRow = matrix[row];
        if (targetRow) {
          targetRow[col] = inOuter || inInner;
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // خطوط هماهنگی (Timing Patterns)
  for (let i = 8; i < size - 8; i++) {
    const r6 = matrix[6];
    if (r6) r6[i] = i % 2 === 0;
    const ri = matrix[i];
    if (ri) ri[6] = i % 2 === 0;
  }

  // داده‌های باینری
  const bits: number[] = [];
  // Mode: Byte (0100)
  bits.push(0, 1, 0, 0);
  // Count: 8 bits
  for (let i = 7; i >= 0; i--) bits.push((utf8.length >> i) & 1);
  // Data
  for (const byte of utf8) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  // Terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
    bytes.push(b);
  }

  // Padding
  const pad = [0xec, 0x11];
  let padIdx = 0;
  while (bytes.length < totalDataBytes) {
    bytes.push(pad[padIdx % 2] ?? 0);
    padIdx++;
  }

  // تصحیح خطا
  const ec = rsCompute(bytes, ecBytes);
  const allData = [...bytes, ...ec];

  // جایگذاری بیت‌ها در شبکه
  let byteIdx = 0;
  let bitIdx = 7;
  let upwards = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // رد کردن خط هماهنگی
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        const targetRow = matrix[row];
        if (!targetRow || targetRow[c] !== null) continue;
        let bit = false;
        if (byteIdx < allData.length) {
          bit = Boolean(((allData[byteIdx] ?? 0) >> bitIdx) & 1);
          bitIdx--;
          if (bitIdx < 0) {
            bitIdx = 7;
            byteIdx++;
          }
        }
        // Mask 0: (row + col) % 2 === 0
        if ((row + c) % 2 === 0) bit = !bit;
        targetRow[c] = bit;
      }
    }
    upwards = !upwards;
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}
