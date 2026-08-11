// ===================== Elementos da página =====================
const scoreDisplay = document.getElementById('score')
const bestScoreDisplay = document.getElementById('bestScore')
const livesDisplay = document.getElementById('lives')
const grid = document.querySelector('.grid')
const playButton = document.getElementById('play')
const startScreen = document.getElementById('startScreen')
const gameScreen = document.getElementById('gameScreen')

const historyList = document.getElementById('historyList')

const modalOverlay = document.getElementById('modalOverlay')
const modalIcon = document.getElementById('modalIcon')
const modalTitle = document.getElementById('modalTitle')
const modalText = document.getElementById('modalText')
const modalScore = document.getElementById('modalScore')
const modalBest = document.getElementById('modalBest')
const modalButton = document.getElementById('modalButton')

// ===================== Tamanho do labirinto =====================
const width = 19
const height = 21
const totalCells = width * height

// Labirinto: 0 = parede, 1 = ponto, 2 = power pellet, 3 = vazio (casa dos fantasmas)
const layout = [
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,2,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,2,0,
  0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,
  0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0,
  0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,
  0,0,0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,0,0,
  0,0,0,0,1,0,1,0,0,3,0,0,1,0,1,0,0,0,0,
  1,1,1,1,1,1,1,0,3,3,3,0,1,1,1,1,1,1,1,
  0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,
  0,0,0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,0,0,
  0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,
  0,2,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,2,0,
  0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,
  0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0,
  0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,
  0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
]

// Posições iniciais (corrigidas para não caírem em cima de paredes)
const PACMAN_START = 13 * width + 9   // corredor aberto, célula com ponto
const GHOSTS_START = [
  { name: 'blinky', index: 8 * width + 9, class: 'blinky', direction: 'UP' },    // saída da casa
  { name: 'pinky',  index: 9 * width + 8, class: 'pinky',  direction: 'DOWN' },
  { name: 'inky',   index: 9 * width + 10, class: 'inky',  direction: 'LEFT' },
  { name: 'clyde',  index: 9 * width + 9, class: 'clyde',  direction: 'RIGHT' }
]
const GHOST_HOME_INDEX = 9 * width + 9

const MAX_LIVES = 3
const HISTORY_LIMIT = 5

// ===================== Estado do jogo =====================
const cells = []
let score = 0
let lives = MAX_LIVES
let bestScore = Number(localStorage.getItem('pacmanBestScore')) || 0
let dotsRemaining = 0

let pacmanIndex = PACMAN_START
let pacmanDirection = 'RIGHT'
let nextDirection = 'RIGHT'

let ghosts = []
let scaredMode = false
let scaredTimer = null

let pacmanLoop = null
let ghostLoop = null
let gridBuilt = false
let gameEnded = false

bestScoreDisplay.textContent = bestScore

// ===================== Construção da grade =====================
function createGrid() {
  grid.innerHTML = ''
  cells.length = 0

  layout.forEach((type, index) => {
    const cell = document.createElement('div')
    cell.dataset.index = index

    if (type === 0) cell.classList.add('wall')
    if (type === 1) cell.classList.add('dot')
    if (type === 2) cell.classList.add('power-pellet')

    cells.push(cell)
    grid.appendChild(cell)
  })

  gridBuilt = true
}

function countDots() {
  return layout.filter(type => type === 1 || type === 2).length
}

// ===================== Desenho =====================
function drawPacman() {
  cells[pacmanIndex].classList.add('pac-man')
}

function removePacman() {
  cells[pacmanIndex].classList.remove('pac-man')
}

function drawGhosts() {
  ghosts.forEach(ghost => {
    cells[ghost.index].classList.remove(ghost.class, 'ghost-scared', 'ghost-eaten')
    cells[ghost.index].classList.add('ghost')
    if (scaredMode) cells[ghost.index].classList.add('ghost-scared')
    else cells[ghost.index].classList.add(ghost.class)
  })
}

function removeGhosts() {
  ghosts.forEach(ghost => {
    cells[ghost.index].classList.remove('ghost', ghost.class, 'ghost-scared', 'ghost-eaten')
  })
}

function renderLives() {
  livesDisplay.innerHTML = ''
  for (let i = 0; i < lives; i++) {
    const heart = document.createElement('i')
    heart.className = 'fa-solid fa-heart'
    livesDisplay.appendChild(heart)
  }
}

// ===================== Movimento do Pac-Man =====================
function movePacman() {
  if (gameEnded) return

  removePacman()

  if (canMove(nextDirection)) {
    pacmanDirection = nextDirection
  }

  if (canMove(pacmanDirection)) {
    pacmanIndex = getNewIndex(pacmanIndex, pacmanDirection)
  }

  if (cells[pacmanIndex].classList.contains('dot')) {
    cells[pacmanIndex].classList.remove('dot')
    score += 10
    dotsRemaining--
  }

  if (cells[pacmanIndex].classList.contains('power-pellet')) {
    cells[pacmanIndex].classList.remove('power-pellet')
    score += 50
    dotsRemaining--
    activatePowerPellet()
  }

  scoreDisplay.textContent = score
  drawPacman()

  if (dotsRemaining <= 0) {
    endGame(true)
    return
  }

  checkGhostCollision()
}

function activatePowerPellet() {
  scaredMode = true
  clearTimeout(scaredTimer)
  scaredTimer = setTimeout(() => {
    scaredMode = false
    if (!gameEnded) drawGhosts()
  }, 7000)
}

function canMove(direction) {
  const newIndex = getNewIndex(pacmanIndex, direction)
  if (newIndex < 0 || newIndex >= totalCells) return true // túnel
  return !cells[newIndex].classList.contains('wall')
}

function getNewIndex(index, direction) {
  if (direction === 'LEFT') {
    if (index % width === 0) return index + width - 1 // túnel esquerdo
    return index - 1
  }
  if (direction === 'RIGHT') {
    if ((index + 1) % width === 0) return index - (width - 1) // túnel direito
    return index + 1
  }
  if (direction === 'UP') return index - width
  if (direction === 'DOWN') return index + width
  return index
}

// ===================== Movimento dos fantasmas =====================
function moveGhosts() {
  if (gameEnded) return

  removeGhosts()

  ghosts.forEach(ghost => {
    const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']
    const opposite = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

    const valid = directions.filter(d => {
      const idx = getGhostNewIndex(ghost.index, d)
      return idx >= 0 && idx < totalCells && !cells[idx].classList.contains('wall')
    })

    // Evita reverter a direção sempre que houver outra opção disponível
    let choices = valid.filter(d => d !== opposite[ghost.direction])
    if (choices.length === 0) choices = valid
    if (choices.length === 0) choices = [ghost.direction]

    ghost.direction = choices[Math.floor(Math.random() * choices.length)]
    ghost.index = getGhostNewIndex(ghost.index, ghost.direction)
  })

  drawGhosts()
  checkGhostCollision()
}

function getGhostNewIndex(index, direction) {
  if (direction === 'LEFT') return index - 1
  if (direction === 'RIGHT') return index + 1
  if (direction === 'UP') return index - width
  if (direction === 'DOWN') return index + width
  return index
}

// ===================== Colisão =====================
function checkGhostCollision() {
  if (gameEnded) return

  for (const ghost of ghosts) {
    if (ghost.index === pacmanIndex) {
      if (scaredMode) {
        score += 200
        scoreDisplay.textContent = score
        cells[ghost.index].classList.remove(ghost.class, 'ghost-scared', 'ghost')
        ghost.index = GHOST_HOME_INDEX
        ghost.direction = 'UP'
      } else {
        loseLife()
      }
      return
    }
  }
}

function loseLife() {
  lives--
  renderLives()

  if (lives <= 0) {
    endGame(false)
    return
  }

  // Reposiciona Pac-Man e fantasmas sem zerar pontos/pontos já comidos
  removePacman()
  removeGhosts()

  pacmanIndex = PACMAN_START
  pacmanDirection = 'RIGHT'
  nextDirection = 'RIGHT'

  ghosts.forEach((ghost, i) => {
    ghost.index = GHOSTS_START[i].index
    ghost.direction = GHOSTS_START[i].direction
  })

  scaredMode = false
  clearTimeout(scaredTimer)

  drawPacman()
  drawGhosts()
}

// ===================== Fim de jogo =====================
function endGame(won) {
  gameEnded = true
  clearInterval(pacmanLoop)
  clearInterval(ghostLoop)
  clearTimeout(scaredTimer)

  const isNewRecord = score > bestScore
  if (isNewRecord) {
    bestScore = score
    localStorage.setItem('pacmanBestScore', bestScore)
    bestScoreDisplay.textContent = bestScore
  }

  saveHistory(score, isNewRecord)

  modalIcon.className = won ? 'fa-solid fa-trophy' : 'fa-solid fa-ghost'
  modalTitle.textContent = won ? 'Você Venceu!' : 'Fim de Jogo'
  modalText.textContent = won
    ? 'Você comeu todos os pontos do labirinto!'
    : 'Os fantasmas pegaram você.'
  modalScore.textContent = score
  modalBest.textContent = bestScore

  showModal()
}

function showModal() {
  modalOverlay.classList.remove('hidden')
}

function hideModal() {
  modalOverlay.classList.add('hidden')
}

// ===================== Histórico =====================
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('pacmanHistory')) || []
  } catch (e) {
    return []
  }
}

function saveHistory(finalScore, isNewRecord) {
  const history = loadHistory()
  history.unshift({ score: finalScore, record: isNewRecord })
  localStorage.setItem('pacmanHistory', JSON.stringify(history.slice(0, HISTORY_LIMIT)))
  renderHistory()
}

function renderHistory() {
  const history = loadHistory()
  historyList.innerHTML = ''

  if (history.length === 0) {
    const li = document.createElement('li')
    li.className = 'empty'
    li.textContent = 'Nenhuma partida registrada ainda'
    historyList.appendChild(li)
    return
  }

  history.forEach(entry => {
    const li = document.createElement('li')
    li.textContent = `${entry.score} pontos`
    if (entry.record) li.classList.add('new-record')
    historyList.appendChild(li)
  })
}

// ===================== Início / reinício do jogo =====================
function initGame() {
  gameEnded = false
  score = 0
  lives = MAX_LIVES
  scaredMode = false
  clearTimeout(scaredTimer)
  clearInterval(pacmanLoop)
  clearInterval(ghostLoop)

  createGrid()
  dotsRemaining = countDots()

  pacmanIndex = PACMAN_START
  pacmanDirection = 'RIGHT'
  nextDirection = 'RIGHT'
  cells[pacmanIndex].classList.remove('dot', 'power-pellet') // não começa em cima de um ponto

  ghosts = GHOSTS_START.map(g => ({ ...g }))

  scoreDisplay.textContent = score
  renderLives()
  drawPacman()
  drawGhosts()

  pacmanLoop = setInterval(movePacman, 150)
  ghostLoop = setInterval(moveGhosts, 350)
}

function goToGameScreen() {
  startScreen.classList.add('hidden-screen')
  gameScreen.classList.remove('hidden-screen')
  initGame()
}

function goToStartScreen() {
  hideModal()
  gameScreen.classList.add('hidden-screen')
  startScreen.classList.remove('hidden-screen')
  renderHistory()
}

// ===================== Eventos =====================
playButton.addEventListener('click', goToGameScreen)
modalButton.addEventListener('click', goToStartScreen)

document.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault()
  }
  if (e.key === 'ArrowLeft') nextDirection = 'LEFT'
  if (e.key === 'ArrowRight') nextDirection = 'RIGHT'
  if (e.key === 'ArrowUp') nextDirection = 'UP'
  if (e.key === 'ArrowDown') nextDirection = 'DOWN'
})

// Controles por toque (swipe) para celular
let touchStartX = 0
let touchStartY = 0

grid.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX
  touchStartY = e.changedTouches[0].clientY
}, { passive: true })

grid.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return // ignora toques muito curtos

  if (Math.abs(dx) > Math.abs(dy)) {
    nextDirection = dx > 0 ? 'RIGHT' : 'LEFT'
  } else {
    nextDirection = dy > 0 ? 'DOWN' : 'UP'
  }
}, { passive: true })

// Mostra o histórico salvo assim que a página carrega
renderHistory()
