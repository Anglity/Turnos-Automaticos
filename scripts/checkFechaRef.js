const fs = require('fs')
const path = require('path')

const needle = '2025-08-25'
const excludeDirs = ['dist', 'node_modules', '.git', 'scripts']

function walk(dir) {
  let res = []
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const full = path.join(dir, d.name)
    if (d.isDirectory()) {
      if (!excludeDirs.includes(d.name)) res = res.concat(walk(full))
    } else {
      res.push(full)
    }
  })
  return res
}

const files = walk(process.cwd()).filter(f =>
  ['.js', '.jsx', '.json', '.ts', '.tsx', '.html'].some(ext => f.endsWith(ext))
)

let found = false
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    if (content.includes(needle)) {
      console.error(`${file}: contains ${needle}`)
      found = true
    }
  } catch (e) {
    // ignore read errors
  }
})

if (found) process.exit(1)
console.log(`OK: no se encontraron referencias a ${needle} en el código fuente.`)
