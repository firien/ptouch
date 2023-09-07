// https://en.wikipedia.org/wiki/PackBits
const packer = (packedBytes, bytes) => {
  if (bytes.length === 1) {
    packedBytes.push(0, bytes.at(0))
  } else if (bytes.at(0) === bytes.at(1)) {
    packedBytes.push((bytes.length - 1) * -1, bytes.at(0))
  } else {
    packedBytes.push(bytes.length - 1, ...bytes)
  }
}

export default (bytes) => {
  const packedBytes = []
  const bufferBytes = []
  for (const byte of bytes) {
    if (bufferBytes.push(byte) > 1) {
      // check if the last 2 are equal
      if (byte === bufferBytes.at(-2)) {
        if (bufferBytes.some(b => b !== byte)) {
          // pack diff
          const slice = bufferBytes.splice(0, bufferBytes.length - 2)
          packer(packedBytes, slice)
        }
      } else {
        // do we need to pack
        if (bufferBytes.at(0) === bufferBytes.at(1)) {
          const slice = bufferBytes.splice(0, bufferBytes.length - 1)
          packer(packedBytes, slice)
        }
      }
    }
  }
  // clean up
  packer(packedBytes, bufferBytes)
  return packedBytes
}
