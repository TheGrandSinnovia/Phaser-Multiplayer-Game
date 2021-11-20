export const addLatencyAndPackagesLoss = (fnc, loss = 0.1, latency = [100, 150]) => {
  if (Math.random() > 1 - loss) return // 10% package loss
  setTimeout(() => fnc(), latency[0] + Math.random() * (latency[1] - latency[0])) // random latency between 100 and 150
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
export const collisionDetection = (rect1, rect2) => {
  if (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  ) {
    return true
  }
  return false
}
