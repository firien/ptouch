import {
  makeLabel,
  setTapeWidth,
  getStatus,
  connect
} from './printer.js'

const byteValueNumberFormatter = Intl.NumberFormat('en', {
  notation: 'compact',
  style: 'unit',
  unit: 'byte',
  unitDisplay: 'narrow'
})
const getOptions = () => {
  return {
    highResolution: document.querySelector('#hires').checked ?? false,
    chain: document.querySelector('#chain').checked ?? false,
    compression: document.querySelector('#compression').checked ?? false,
    autoCut: document.querySelector('#auto-cut').checked ?? false
  }
}
let device
let buffer
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('button#connect').addEventListener('click', async (e) => {
    device = await connect()
    e.target.disabled = true
    getStatus(device)
    document.querySelector('button#print').disabled = false
    document.querySelector('button#status').disabled = false
  })
  document.querySelector('button#print').addEventListener('click', async (e) => {
    const f = await device.transferOut(2, buffer)
    console.log(f)
  })
  const textInput = document.querySelector('textarea#text')
  const getLines = () => textInput.value.split(/\r?\n/)
  textInput.addEventListener('input', async (e) => {
    const blob = makeLabel(getLines(), getOptions())
    buffer = await blob.arrayBuffer()
    document.querySelector('output').value = byteValueNumberFormatter.format(buffer.byteLength)
  })
  document.querySelector('button#status').addEventListener('click', async (e) => {
    getStatus(device)
  })
  document.querySelector('select#tape-width').addEventListener('change', async (e) => {
    setTapeWidth(Number(e.target.value))
  })
  self.addEventListener('tapeWidth', (e) => {
    document.querySelector('select#tape-width').value = String(e.detail)
  })
  for (const cb of document.querySelectorAll('input[type=checkbox]')) {
    cb.addEventListener('click', async (e) => {
      const blob = makeLabel(getLines(), getOptions())
      buffer = await blob.arrayBuffer()
      document.querySelector('output').value = byteValueNumberFormatter.format(buffer.byteLength)
    })
  }
})
