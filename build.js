import esbuild from 'esbuild'
import ghPages from 'esbuild-plugin-ghpages-pwa'

const { plugin: githubPages, buildOptions } = ghPages({
  app: 'ptouch',
  description: 'Probably does something cool',
  cacheTag: 1, // used to clear old browser caches
  serve: 3070 // port for local web server
})

try {
  await esbuild.build(Object.assign(buildOptions, {
    entryPoints: [
      'javascripts/index.js',
      'stylesheets/index.css'
    ],
    target: ['chrome78', 'safari13'],
    plugins: [
      githubPages
    ]
  }))
} catch (err) {
  console.error(err)
  process.exit(1)
}
