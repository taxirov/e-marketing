const modules = import.meta.glob('../images/obyekt/*.{jpg,jpeg,png}', { eager: true, import: 'default' })

function toImageEntry(path, value) {
  const filename = path.split('/').pop() || path
  const id = filename.replace(/\.[^.]+$/, '')
  const url = typeof value === 'string' ? value : value?.default || ''
  return { id, filename, url }
}

const OBJECT_IMAGES = Object.entries(modules)
  .map(([path, mod]) => toImageEntry(path, mod))
  .filter((entry) => entry.url)
  .sort((a, b) => a.filename.localeCompare(b.filename))

const OBJECT_IMAGE_MAP = OBJECT_IMAGES.reduce((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

export { OBJECT_IMAGES, OBJECT_IMAGE_MAP }

export function resolveObjectImages(ids = []) {
  if (!Array.isArray(ids)) return []
  return ids
    .map((id) => OBJECT_IMAGE_MAP[id])
    .filter(Boolean)
}
