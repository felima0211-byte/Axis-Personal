// Load test environment variables (.env.test if present)
// In CI, set these via environment directly
import { config } from 'dotenv'
config({ path: '.env.test' })
