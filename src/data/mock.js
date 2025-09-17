import raw from './binolar.json'
import { normalizeObjects } from './normalize'

const rows = normalizeObjects(raw)

export default rows
