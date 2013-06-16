### BiMap

A bi-direction map maps an association `<k1, k2>` to a value.
It is constructed with two maps, the first one maps `KEY1` to
multiple `KEY2` entries, with each `KEY2` entry associated with
a value. On the contrary, the second one maps `KEY2` to multiple
`KEY1` entries, associated with the same value as `KEY2` in `KEY1` map.

When removing a specific `<k1, k2>` association, entries are removed
from both maps. When removing all association with `k1`, all `KEY2` keys
are removed from first map, and all `<?, k1>` are removed from the
second map.

See [BiMap.js](https://github.com/evo-cloud/elements/blob/master/lib/BiMap.js) for how to use it. The comments are quite straightforward.