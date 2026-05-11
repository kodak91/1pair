const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcVal = crc32(Buffer.concat([typeBuffer, data]))
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crcVal, 0)
  return Buffer.concat([len, typeBuffer, data, crcBuffer])
}

function createPNG(size, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // 둥근 모서리 효과를 위한 픽셀 데이터 (단색 배경 + 흰 텍스트 없음, 심플 핑크)
  const rowSize = size * 3
  const rawData = Buffer.alloc((rowSize + 1) * size)
  const radius = size * 0.2  // 20% 라운드 코너

  for (let y = 0; y < size; y++) {
    rawData[y * (rowSize + 1)] = 0
    for (let x = 0; x < size; x++) {
      const offset = y * (rowSize + 1) + 1 + x * 3
      // 라운드 코너 체크
      const cx = Math.min(x, size - 1 - x)
      const cy = Math.min(y, size - 1 - y)
      const inCorner = cx < radius && cy < radius &&
        Math.sqrt((cx - radius) ** 2 + (cy - radius) ** 2) > radius

      if (inCorner) {
        rawData[offset] = 255; rawData[offset + 1] = 255; rawData[offset + 2] = 255
      } else {
        rawData[offset] = r; rawData[offset + 1] = g; rawData[offset + 2] = b
      }
    }
  }

  const compressed = zlib.deflateSync(rawData)
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ])
}

// #ff6b9d = rgb(255, 107, 157)
const [r, g, b] = [255, 107, 157]
fs.writeFileSync('public/icon-192.png', createPNG(192, r, g, b))
fs.writeFileSync('public/icon-512.png', createPNG(512, r, g, b))
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, r, g, b))
fs.writeFileSync('public/favicon.ico', createPNG(32, r, g, b))  // ico로 png 써도 브라우저 수용
console.log('✅ 아이콘 생성 완료: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico')
