function getChildAcross(start_tile, split) {
  let leaves = getAllLeaves(start_tile)
  let dims = leaves.map(l => getDimsByID(l.id))
  let edges = dims.map(d => {
    d[2] = d[0] + d[2]
    d[3] = d[1] + d[3]
    return d
  })
  let count = 0
  // change for y
  let edge1 = split === 'v' ? 0 : 1
  let edge2 = split === 'v' ? 2 : 3
  let min_edge = Math.min(...edges.map(e => e[edge1]))
  function getSmall(start_edge) {
    let neighbors = edges.filter(e => e[edge1] === start_edge)
    if (neighbors.length !== 0) {
      count++
      let sizes = neighbors.map(n => n[edge2] - n[edge1])
      let min_size = Math.min(...sizes)
      let min_index = sizes.indexOf(min_size)
      let next_edge = neighbors[min_index][edge2]
      getSmall(next_edge)
    }
  }
  getSmall(min_edge)
  return count
}
