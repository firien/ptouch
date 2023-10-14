import packBits from './pack-bits.js'

const totalPinCount = 128
let printAreaPins = 0
let marginPins = 0
let mediaWidth

const getMediaWidth = (int) => {
  switch (int) {
    case 4:
      return 3.5
    default:
      return int
  }
}

const getMediaType = (int) => {
  switch (int) {
    case 0x0:
      return 'No media'
    case 0x1:
      return 'Laminated Tape'
    case 0x3:
      return 'Non-Laminated Tape'
    case 0x11:
    case 0x17:
      return 'Heat Shrink Tape'
    default:
      return 'Incompatible tape'
  }
}

const grayscale = function (r, g, b) {
  if (typeof r === 'undefined') {
    return 0
  }
  // luma
  // https://stackoverflow.com/questions/37159358/save-canvas-in-grayscale
  // (r * 0.2126) + (g * 0.7152) + (b * 0.0722)
  // escp
  const px = (r + g + b) / 3
  // return (px <= 230)
  return px > 230 ? 0 : 1
}

const printBuffer = function (width, height, ctx, options) {
  const invalidate = new ArrayBuffer(100)
  const initialize = new Uint8Array([0x1B, 0x40])
  const switchToRaster = new Uint8Array([0x1B, 0x69, 0x61, 0x01])
  const printInformationCommand = new Uint8Array([0x1B, 0x69, 0x7A, 0x4 | 0x2, 0x01, mediaWidth, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  const dv = new DataView(printInformationCommand.buffer)
  dv.setUint32(7, width, true)
  let vm = 0
  vm |= options.autoCut << 6
  const variousModeSettings = new Uint8Array([0x1B, 0x69, 0x4D, vm])
  // twiddle some bits
  let av = 0
  av |= ((options.halfCut ? 0 : 1) << 2)
  av |= ((options.chain ? 0 : 1) << 3)
  av |= options.highResolution << 6
  const advancedModeSettings = new Uint8Array([0x1B, 0x69, 0x4B, av])
  const margin = new Uint8Array([0x1B, 0x69, 0x64, 0x00, 0x00])
  const dv1 = new DataView(margin.buffer)
  const feedAmount = 14 * (options.highResolution ? 2 : 1)
  dv1.setUint16(3, feedAmount, true)
  const compresssion = new Uint8Array([0x4D, options.compression ? 2 : 0])
  const rasterData = rasterLines(width, height, ctx, options.compression)
  const printCommand = new Uint8Array([0x1A])
  return new Blob([
    invalidate,
    initialize,
    switchToRaster,
    printInformationCommand,
    variousModeSettings,
    advancedModeSettings,
    margin,
    compresssion,
    rasterData,
    printCommand
  ])
}

const rasterLines = function (width, height, ctx, compression = false) {
  const bytesPerPixel = 4// RGBA
  const bytesPerLine = height / 8
  const buffers = []
  const img = ctx.getImageData(0, 0, width, height)
  const pixels = img.data
  for (let line = 0; line < width; ++line) {
    const lineBuffer = new Uint8Array(bytesPerLine)
    let byteCount = 0
    let byte = 0
    let bitOffset = 7
    for (let index = 0; index <= height; ++index) {
      // every 8 bits go in a byte
      const pixelStart = (line * bytesPerPixel) + ((width * bytesPerPixel) * index)
      // disregard alpha pixel
      const bit = grayscale(pixels[pixelStart], pixels[pixelStart + 1], pixels[pixelStart + 2])
      if (bit === 1) {
        byte |= (bit << bitOffset)
      }
      bitOffset--
      if (bitOffset < 0) {
        lineBuffer[byteCount++] = Number(byte)
        byte = 0
        bitOffset = 7
      }
    }
    const initRasterLineCommand = new Uint8Array([0x47, 0, 0])
    const dv = new DataView(initRasterLineCommand.buffer)
    if (compression) {
      const packedBuffer = new Int8Array(packBits(lineBuffer))
      dv.setUint16(1, packedBuffer.length, true)
      buffers.push(initRasterLineCommand, packedBuffer)
    } else {
      dv.setUint16(1, lineBuffer.length, true)
      buffers.push(initRasterLineCommand, lineBuffer)
    }
  }
  return new Blob(buffers)
}

// text should be array of string
export const makeLabel = function (lines, options) {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('id', 'ptouch')
  const setDimensions = function (w, h) {
    canvas.width = w
    // canvas.style.width = `${w / window.devicePixelRatio}px`
    canvas.height = h
    // canvas.style.height = `${h / window.devicePixelRatio}px`
  }
  const h = printAreaPins * (options.highResolution ? 2 : 1)
  // temp width
  let w = 200

  setDimensions(w, h)
  // let canvas = new OffscreenCanvas(w, h)
  const fontSize = 5.5 * getMediaWidth(mediaWidth) * (options.highResolution ? 2 : 1) / lines.length
  const font = `${fontSize}px Helvetica Neue`
  const ctx = canvas.getContext('2d')
  ctx.font = font
  const margin = 10
  const widths = []
  lines.map(line => {
    const mt = ctx.measureText(line)
    widths.push(Math.ceil(mt.width + (margin * 2)))
    return mt.height
  })
  w = Math.max(...widths)
  setDimensions(w, h)
  ctx.font = font

  // no alphas - make background white
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'black'
  // ctx.textAlign = lines.length === 1 ? 'center' : 'left'
  ctx.textBaseline = 'middle'
  const gap = (10 / 12) * getMediaWidth(mediaWidth) * (options.highResolution ? 2 : 1)
  const dy = (h - (gap * (lines.length - 1))) / (lines.length + 1)
  lines.forEach((line, i) => {
    ctx.fillText(line, margin, dy * (i + 1) + (gap * i))
  })

  const current = document.querySelector('#ptouch')
  if (current) {
    document.body.replaceChild(canvas, current)
  } else {
    document.body.appendChild(canvas)
  }

  let marginCanvas
  let marginCtx
  // margin
  if (marginPins > 0) {
    // redraw with margins
    marginCanvas = new OffscreenCanvas(w, totalPinCount * (options.highResolution ? 2 : 1))
    marginCtx = marginCanvas.getContext('2d')
    marginCtx.fillStyle = 'white'
    marginCtx.fillRect(0, 0, w, totalPinCount)
    marginCtx.drawImage(canvas, 0, marginPins * (options.highResolution ? 2 : 1))
  }

  if (options.highResolution) {
    // printing resoluion is only doubled along main axis of tape
    // so we retain our full width but scale height by 0.5
    const hires = new OffscreenCanvas(w, totalPinCount)
    const hictx = hires.getContext('2d')
    hictx.fillStyle = 'white'
    hictx.fillRect(0, 0, w, totalPinCount)
    hictx.drawImage(marginCanvas ?? canvas, 0, 0, w, totalPinCount)
    return printBuffer(w, totalPinCount, hictx, options)
  } else {
    return printBuffer(w, totalPinCount, marginCtx ?? ctx, options)
  }
}

export const connect = async () => {
  const device = await navigator.usb.requestDevice({
    filters: [{
      vendorId: 0x04F9,
      productId: 0x20AF
    }]
  })
  await device.open()
  await device.selectConfiguration(1)
  await device.claimInterface(0)
  return device
}

export const setTapeWidth = (width) => {
  mediaWidth = width
  switch (width) {
    case 3.5:
      mediaWidth = 4
      printAreaPins = 24
      marginPins = 52
      break
    case 6:
      printAreaPins = 32
      marginPins = 48
      break
    case 9:
      printAreaPins = 50
      marginPins = 39
      break
    case 12:
      printAreaPins = 70
      marginPins = 29
      break
    case 18:
      printAreaPins = 112
      marginPins = 8
      break
    case 24:
      printAreaPins = 128
      marginPins = 0
  }
}
export const getStatus = async (device) => {
  const invalidate = new ArrayBuffer(100)
  const initialize = new Uint8Array([0x1B, 0x40])
  const status = new Uint8Array([0x1B, 0x69, 0x53])
  const blob = new Blob([invalidate, initialize, status])
  const buffer = await blob.arrayBuffer()
  await device.transferOut(2, buffer)
  const { data } = await device.transferIn(1, 32)
  const printHead = data.getUint8(0)
  const size = data.getUint8(1)
  const brotherCode = data.getUint8(2)
  const seriesCode = data.getUint8(3)
  const modelCode = data.getUint8(4)
  console.info(modelCode)
  const countryCode = data.getUint8(5)
  const error1 = data.getUint8(8)
  const error2 = data.getUint8(9)
  mediaWidth = data.getUint8(10)
  const mediaType = data.getUint8(11)
  const mediaColor = data.getUint8(24)
  setTapeWidth(getMediaWidth(mediaWidth))
  const evt = new CustomEvent('tapeWidth', { detail: getMediaWidth(mediaWidth) })
  self.dispatchEvent(evt)
}
