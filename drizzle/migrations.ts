import journal from './meta/_journal.json'
import m0000 from './0000_wandering_bulldozer.sql'
import m0001 from './0001_boring_human_torch.sql'

export default {
  journal,
  migrations: { m0000, m0001 },
}
