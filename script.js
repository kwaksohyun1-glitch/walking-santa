const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const saveBtn = document.getElementById('saveBtn');
const importBtn = document.getElementById('importBtn');
const recordBtn = document.getElementById('recordBtn');
const saveBodyBtn = document.getElementById('saveBodyBtn');
const saveScarfBtn = document.getElementById('saveScarfBtn');
const importBodyBtn = document.getElementById('importBodyBtn');
const importScarfBtn = document.getElementById('importScarfBtn');
const playBtn = document.getElementById('playBtn');
const timeDisplay = document.getElementById('timeDisplay');
const importLastSavedBtn = document.getElementById('importLastSavedBtn');
const toggleGridBtn = document.getElementById('toggleGridBtn');
const saveGifBtn = document.getElementById('saveGifBtn');
const importFile = document.getElementById('importFile');
const musicFile = document.getElementById('musicFile');
const bgImageFile = document.getElementById('bgImageFile');
const uploadBgImageBtn = document.getElementById('uploadBgImageBtn');
const toggleBgImageBtn = document.getElementById('toggleBgImageBtn');
const removeBgImageBtn = document.getElementById('removeBgImageBtn');

// 그리드 설정
const GRID_SIZE = 45;
const CELL_SIZE = 12;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// 레이어 정의
const layers = [
    { id: 'body', name: 'Body (얼굴, 다리)', color: '#ff3c32', symbol: 'X', type: 'x-pattern' },
    { id: 'scarf', name: 'Scarf (망토)', color: '#ff3c32', symbol: 'X', type: 'x-pattern' }
];

// 현재 선택된 도구
let currentTool = 'body';
let currentToolSize = '1x';
let currentLayer = layers[0].id; // 기본값: body

// 프레임 설정
const TOTAL_FRAMES = 6;
let currentFrame = 0;
let playInterval = null;
const FRAME_DELAY = 200; // 밀리초

// 프레임별 그리드 데이터: 각 프레임마다 독립적인 그리드 데이터 저장
const framesData = Array(TOTAL_FRAMES).fill(null).map(() => 
    Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({}))
    )
);

// 현재 프레임의 그리드 데이터 참조
let gridData = framesData[currentFrame];

// 레이어 활성화 상태
const layerActive = {};
layers.forEach(layer => {
    layerActive[layer.id] = true;
});

// 레이어 음악 파일
const layerMusic = {};

// 그리드 표시 상태
let showGrid = true;

// 현재 호버 중인 그리드 위치
let hoveredRow = -1;
let hoveredCol = -1;

// 배경 이미지
let backgroundImage = null;
let showBackgroundImage = true; // 배경 이미지 표시 여부

// 저장된 프레임 패턴 (최근 저장한 프레임)
let lastSavedFramePattern = null;
let lastSavedFrameIndex = -1;

// 레이어별 저장된 패턴
let savedBodyPattern = null;
let savedScarfPattern = null;

// 재생 상태
let isPlaying = false;

// 레이어 UI 생성
function createLayerUI() {
    const container = document.getElementById('layersContainer');
    if (!container) return; // 레이어 컨테이너가 없으면 리턴
    container.innerHTML = '';
    
    layers.forEach(layer => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        layerDiv.dataset.layerId = layer.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'layer-checkbox';
        checkbox.checked = layerActive[layer.id];
        checkbox.addEventListener('change', (e) => {
            layerActive[layer.id] = e.target.checked;
            drawCanvas();
        });
        
        const colorBox = document.createElement('div');
        colorBox.className = 'layer-color';
        colorBox.style.backgroundColor = layer.color;
        colorBox.addEventListener('click', () => {
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.value = layer.color;
            colorPicker.addEventListener('change', (e) => {
                layer.color = e.target.value;
                colorBox.style.backgroundColor = layer.color;
                drawCanvas();
            });
            colorPicker.click();
        });
        
        const label = document.createElement('span');
        label.className = 'layer-label';
        label.textContent = layer.name;
        
        const musicBtn = document.createElement('button');
        musicBtn.className = 'layer-music-btn';
        musicBtn.textContent = 'Select Music';
        musicBtn.addEventListener('click', () => {
            musicFile.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    layerMusic[layer.id] = {
                        name: file.name,
                        file: file
                    };
                    updateLayerMusicInfo(layerDiv, layer.id);
                }
            };
            musicFile.click();
        });
        
        const musicInfo = document.createElement('div');
        musicInfo.className = 'layer-music-info';
        musicInfo.id = `music-info-${layer.id}`;
        
        layerDiv.appendChild(checkbox);
        layerDiv.appendChild(colorBox);
        layerDiv.appendChild(label);
        layerDiv.appendChild(musicBtn);
        layerDiv.appendChild(musicInfo);
        
        container.appendChild(layerDiv);
        updateLayerMusicInfo(layerDiv, layer.id);
    });
}

function updateLayerMusicInfo(layerDiv, layerId) {
    const musicInfo = layerDiv.querySelector(`#music-info-${layerId}`);
    if (layerMusic[layerId]) {
        musicInfo.textContent = `${layerMusic[layerId].name} (1:21 / 2:18)`;
    } else {
        musicInfo.textContent = '';
    }
}

// 도구 선택 UI 생성
function createToolUI() {
    const container = document.getElementById('toolSelection');
    if (!container) {
        console.error('도구 선택 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 컨테이너 초기화
    container.innerHTML = '';
    
    // Body 레이어 버튼
    const toolBody = createToolItem('body', 'Body', [
        { label: '1x', value: '1x' }
    ]);
    
    // Scarf 레이어 버튼
    const toolScarf = createToolItem('scarf', 'Scarf', [
        { label: '1x', value: '1x' }
    ]);
    
    container.appendChild(toolBody);
    container.appendChild(toolScarf);
}

function createToolItem(toolId, label, sizeOptions, hasInput = false, inputValue = '', hasKeyboardHint = false) {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-item';
    toolDiv.dataset.toolId = toolId;
    
    if (toolId === currentTool) {
        toolDiv.classList.add('active');
    }
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'tool-label';
    labelSpan.textContent = label;
    toolDiv.appendChild(labelSpan);
    
    // Body 또는 Scarf인 경우 색상 선택기 추가
    if (toolId === 'body' || toolId === 'scarf') {
        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.style.marginTop = '8px';
        colorPickerContainer.style.marginBottom = '8px';
        
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.id = toolId + 'ColorPicker';
        const layer = layers.find(l => l.id === toolId);
        colorPicker.value = layer ? layer.color : '#ff3c32';
        colorPicker.style.width = '100%';
        colorPicker.style.height = '32px';
        colorPicker.style.border = '1px solid #555';
        colorPicker.style.borderRadius = '4px';
        colorPicker.style.cursor = 'pointer';
        colorPicker.style.backgroundColor = '#3a3a3a';
        
        colorPicker.addEventListener('change', (e) => {
            const targetLayer = layers.find(l => l.id === toolId);
            if (targetLayer) {
                targetLayer.color = e.target.value;
                drawCanvas();
                updateAllThumbnails();
            }
        });
        
        // 클릭 이벤트가 도구 선택으로 전파되지 않도록
        colorPicker.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        colorPickerContainer.appendChild(colorPicker);
        toolDiv.appendChild(colorPickerContainer);
    }
    
    if (sizeOptions) {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'tool-options';
        
        sizeOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'size-btn';
            btn.textContent = option.label;
            if (toolId === currentTool && option.value === currentToolSize) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentTool = toolId;
                currentToolSize = option.value;
                // 도구가 레이어 ID인 경우 레이어도 업데이트
                if (toolId === 'body' || toolId === 'scarf') {
                    currentLayer = toolId;
                }
                updateToolSelection();
            });
            optionsDiv.appendChild(btn);
        });
        
        toolDiv.appendChild(optionsDiv);
        
        // 도구 클릭 이벤트 (색상 선택기나 버튼 제외)
        toolDiv.addEventListener('click', (e) => {
            if (e.target.type === 'color' || e.target.classList.contains('size-btn')) {
                return;
            }
            currentTool = toolId;
            if (toolId === 'body' || toolId === 'scarf') {
                currentLayer = toolId;
            }
            updateToolSelection();
        });
    } else if (hasInput) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'size-input-group';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'size-input';
        input.value = inputValue;
        input.addEventListener('change', (e) => {
            if (toolId === currentTool) {
                currentToolSize = e.target.value;
            }
        });
        
        const fixedBtn = document.createElement('button');
        fixedBtn.className = 'fixed-btn';
        fixedBtn.textContent = 'fixed';
        
        inputGroup.appendChild(input);
        inputGroup.appendChild(fixedBtn);
        toolDiv.appendChild(inputGroup);
        
        toolDiv.addEventListener('click', () => {
            currentTool = toolId;
            updateToolSelection();
        });
    } else if (hasKeyboardHint) {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.textContent = '키보드로도 선택 가능';
        toolDiv.appendChild(hint);
        
        toolDiv.addEventListener('click', () => {
            currentTool = toolId;
            updateToolSelection();
        });
    }
    
    return toolDiv;
}

function updateToolSelection() {
    document.querySelectorAll('.tool-item').forEach(item => {
        if (item.dataset.toolId === currentTool) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTool = document.querySelector(`[data-tool-id="${currentTool}"]`);
    if (activeTool) {
        const activeSizeBtn = Array.from(activeTool.querySelectorAll('.size-btn'))
            .find(btn => btn.textContent === currentToolSize);
        if (activeSizeBtn) {
            activeSizeBtn.classList.add('active');
        }
    }
}

// 그리드 그리기
function drawGrid() {
    if (!showGrid) return;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        const pos = i * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
}

// 그리드 번호 표시 (캔버스 밖에 표시)
function drawGridNumbers() {
    const rowNumbers = document.getElementById('rowNumbers');
    const colNumbers = document.getElementById('colNumbers');
    
    if (!rowNumbers || !colNumbers) return;
    
    // 행 번호 (왼쪽) - 5 간격으로 표시
    rowNumbers.innerHTML = '';
    for (let i = 1; i <= GRID_SIZE; i++) {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'grid-number row-number';
        numberDiv.dataset.row = i - 1;
        
        // 5의 배수만 표시
        if (i % 5 === 0 || i === 1) {
            numberDiv.textContent = i;
        } else {
            numberDiv.textContent = '';
        }
        
        // 호버 중인 행인지 확인
        if (hoveredRow === i - 1) {
            numberDiv.style.color = '#ffffff';
            // 호버 중이면 번호 표시
            if (!numberDiv.textContent) {
                numberDiv.textContent = i;
            }
        } else {
            numberDiv.style.color = '#d0d0d0';
        }
        
        rowNumbers.appendChild(numberDiv);
    }
    
    // 열 번호 (상단) - 5 간격으로 표시
    colNumbers.innerHTML = '';
    for (let i = 1; i <= GRID_SIZE; i++) {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'grid-number col-number';
        numberDiv.dataset.col = i - 1;
        
        // 5의 배수만 표시
        if (i % 5 === 0 || i === 1) {
            numberDiv.textContent = i;
        } else {
            numberDiv.textContent = '';
        }
        
        // 호버 중인 열인지 확인
        if (hoveredCol === i - 1) {
            numberDiv.style.color = '#ffffff';
            // 호버 중이면 번호 표시
            if (!numberDiv.textContent) {
                numberDiv.textContent = i;
            }
        } else {
            numberDiv.style.color = '#d0d0d0';
        }
        
        colNumbers.appendChild(numberDiv);
    }
}

// 도구별 그리기 함수
function drawHorizontalSquare(row, col, color, size) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const cellSize = CELL_SIZE * parseFloat(size);
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawVerticalSquare(row, col, color, size) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const cellSize = CELL_SIZE * parseFloat(size);
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize, cellSize);
}

function drawHorizontalDash(row, col, color, size) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const length = CELL_SIZE * parseFloat(size);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + CELL_SIZE / 2);
    ctx.lineTo(x + length, y + CELL_SIZE / 2);
    ctx.stroke();
}

function drawVerticalDash(row, col, color, size) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const length = CELL_SIZE * parseFloat(size);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE / 2, y);
    ctx.lineTo(x + CELL_SIZE / 2, y + length);
    ctx.stroke();
}

function drawDot(row, col, color) {
    const x = col * CELL_SIZE + CELL_SIZE / 2;
    const y = row * CELL_SIZE + CELL_SIZE / 2;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
}

// X자 그리기 (대각선 교차)
function drawX(row, col, color) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    
    // 1.25배 크게: 현재 크기 (CELL_SIZE - 4) * 1.25
    // 새로운 여백: (CELL_SIZE - (CELL_SIZE - 4) * 1.25) / 2
    const currentSize = CELL_SIZE - 4; // 현재 크기 (12 - 4 = 8)
    const newSize = currentSize * 1.25; // 새로운 크기 (8 * 1.25 = 10)
    const margin = (CELL_SIZE - newSize) / 2; // 새로운 여백 (12 - 10) / 2 = 1
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4; // 1.2배 굵게 (2 * 1.2)
    ctx.lineCap = 'round'; // 꼭짓점 라운드
    
    ctx.beginPath();
    ctx.moveTo(x + margin, y + margin);
    ctx.lineTo(x + CELL_SIZE - margin, y + CELL_SIZE - margin);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE - margin, y + margin);
    ctx.lineTo(x + margin, y + CELL_SIZE - margin);
    ctx.stroke();
}

// 캔버스 그리기
function drawCanvas() {
    // 배경 그리기
    if (backgroundImage && showBackgroundImage) {
        // 배경 이미지가 있고 표시 모드이면 이미지로 채우기
        ctx.drawImage(backgroundImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    } else {
        // 흰 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    
    // 모든 레이어 그리기 (데이터가 있으면 그리기)
    layers.forEach(layer => {
        // 레이어가 비활성화되어 있어도 데이터가 있으면 그리기
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellData = gridData[row][col];
                if (cellData[layer.id]) {
                    const data = cellData[layer.id];
                    switch (data.type) {
                        case 'x-pattern':
                            drawX(row, col, layer.color);
                            break;
                        case 'horizontal-square':
                            drawHorizontalSquare(row, col, layer.color, data.size || '1x');
                            break;
                        case 'vertical-square':
                            drawVerticalSquare(row, col, layer.color, data.size || '1x');
                            break;
                        case 'horizontal-dash':
                            drawHorizontalDash(row, col, layer.color, data.size || '0.5x');
                            break;
                        case 'vertical-dash':
                            drawVerticalDash(row, col, layer.color, data.size || '0.5x');
                            break;
                        case 'dot':
                            drawDot(row, col, layer.color);
                            break;
                    }
                }
            }
        }
    });
    
    drawGrid();
    
    // 호버 중인 셀 그레이로 표시 (그리드 위에)
    if (hoveredRow >= 0 && hoveredRow < GRID_SIZE && hoveredCol >= 0 && hoveredCol < GRID_SIZE) {
        const x = hoveredCol * CELL_SIZE;
        const y = hoveredRow * CELL_SIZE;
        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)'; // 반투명 그레이
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
    
    // 현재 프레임 썸네일 업데이트
    const currentThumbnail = document.querySelector(`.frame-thumbnail-wrapper[data-frame="${currentFrame}"] .frame-thumbnail`);
    if (currentThumbnail) {
        drawFrameThumbnail(currentThumbnail, currentFrame);
    }
}

// 그리기 함수
function drawAtPosition(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    
    const layer = layers.find(l => l.id === currentLayer);
    if (!layer) return;
    
    // 레이어가 비활성화되어 있으면 활성화
    if (!layerActive[layer.id]) {
        layerActive[layer.id] = true;
    }
    
    const size = currentToolSize;
    let type = 'x-pattern'; // 모든 도구는 x-pattern
    
    // 도구가 레이어 ID와 동일하면 해당 레이어 사용
    if (currentTool === 'body' || currentTool === 'scarf') {
        // currentTool이 레이어 ID이므로 그대로 사용
        type = 'x-pattern';
    } else {
        // 기존 호환성 유지
        type = currentTool === 'x-pattern' ? 'x-pattern' : 'x-pattern';
    }
    
    // currentTool이 레이어 ID인 경우 해당 레이어에 그리기
    const targetLayerId = (currentTool === 'body' || currentTool === 'scarf') ? currentTool : layer.id;
    const targetLayer = layers.find(l => l.id === targetLayerId);
    if (targetLayer) {
        gridData[row][col][targetLayerId] = { type, size };
    }
    
    // 마지막으로 그린 위치 저장
    lastDrawnPosition = { row, col, layerId: layer.id };
    
    drawCanvas();
}

// 그리드 위치 변환
function getGridPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    return { row, col };
}

// 마지막으로 그린 위치 추적
let lastDrawnPosition = null;

// 지우기 모드
let isEraseMode = false;

// 마우스 이벤트
let isDrawing = false;

canvas.addEventListener('mousedown', (e) => {
    const { row, col } = getGridPosition(e);
    
    if (isEraseMode) {
        // 지우기 모드: 클릭한 위치의 X자 지우기
        eraseAtPosition(row, col);
    } else {
        // 그리기 모드
        isDrawing = true;
        drawAtPosition(row, col);
    }
});

canvas.addEventListener('mousemove', (e) => {
    const { row, col } = getGridPosition(e);
    
    // 호버 상태 업데이트
    if (row !== hoveredRow || col !== hoveredCol) {
        hoveredRow = row;
        hoveredCol = col;
        drawGridNumbers();
        drawCanvas(); // 호버 셀 표시를 위해 캔버스 다시 그리기
    }
    
    // 그리기/지우기 처리
    if (isDrawing && !isEraseMode) {
        drawAtPosition(row, col);
    } else if (isEraseMode && isDrawing) {
        // 지우기 모드에서 드래그로 지우기
        eraseAtPosition(row, col);
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    hoveredRow = -1;
    hoveredCol = -1;
    drawGridNumbers();
    drawCanvas(); // 호버 셀 제거를 위해 캔버스 다시 그리기
});

// 지우기 함수
function eraseAtPosition(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    
    // currentTool이 레이어 ID인 경우 해당 레이어만 지우기
    const targetLayerId = (currentTool === 'body' || currentTool === 'scarf') ? currentTool : currentLayer;
    
    // 해당 위치의 레이어 데이터 삭제
    if (gridData[row][col][targetLayerId]) {
        delete gridData[row][col][targetLayerId];
        drawCanvas();
    }
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    // Shift 키로 지우기 모드
    if (e.key === 'Shift' || e.shiftKey) {
        isEraseMode = true;
        clearBtn.textContent = '그리기';
        clearBtn.style.background = '#667eea';
        clearBtn.style.borderColor = '#667eea';
        canvas.style.cursor = 'crosshair';
    }
    
    // B 키로 배경 이미지 숨기기/보이기 토글
    if (e.key === 'b' || e.key === 'B') {
        if (!backgroundImage) {
            return; // 이미지가 없으면 동작하지 않음
        }
        showBackgroundImage = !showBackgroundImage;
        toggleBgImageBtn.textContent = showBackgroundImage ? '이미지 숨기기' : '이미지 보이기';
        drawCanvas();
        // 모든 프레임 썸네일 업데이트
        updateAllThumbnails();
    }
    
    // 레이어 선택 (1-5)
    if (e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (index < layers.length) {
            currentLayer = layers[index].id;
            updateToolSelection();
        }
    }
});

document.addEventListener('keyup', (e) => {
    // Shift 키를 떼면 그리기 모드
    if (e.key === 'Shift' || !e.shiftKey) {
        isEraseMode = false;
        clearBtn.textContent = '지우기';
        clearBtn.style.background = '';
        clearBtn.style.borderColor = '';
        canvas.style.cursor = 'crosshair';
    }
});

// 버튼 이벤트
clearBtn.addEventListener('click', () => {
    // 지우기 모드 토글
    isEraseMode = !isEraseMode;
    
    if (isEraseMode) {
        clearBtn.textContent = '그리기';
        clearBtn.style.background = '#667eea';
        clearBtn.style.borderColor = '#667eea';
        canvas.style.cursor = 'crosshair';
    } else {
        clearBtn.textContent = '지우기';
        clearBtn.style.background = '';
        clearBtn.style.borderColor = '';
        canvas.style.cursor = 'crosshair';
    }
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('모든 패턴을 지우시겠습니까?')) {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                gridData[row][col] = {};
            }
        }
        drawCanvas();
    }
});

saveBtn.addEventListener('click', () => {
    try {
        // 현재 프레임 데이터 저장
        framesData[currentFrame] = gridData;
        
        const data = {
            framesData,
            layers: layers.map(l => ({ id: l.id, color: l.color })),
            layerActive,
            version: '2.0',
            totalFrames: TOTAL_FRAMES
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pattern-${Date.now()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        console.log('패턴이 저장되었습니다.');
    } catch (error) {
        alert('패턴 저장 중 오류가 발생했습니다: ' + error.message);
        console.error('Save error:', error);
    }
});

importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            // 프레임 데이터 불러오기 (버전 2.0)
            if (data.framesData && Array.isArray(data.framesData)) {
                // 모든 프레임 데이터 초기화
                for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
                    for (let row = 0; row < GRID_SIZE; row++) {
                        for (let col = 0; col < GRID_SIZE; col++) {
                            framesData[frame][row][col] = {};
                        }
                    }
                }
                
                // 저장된 데이터 복원
                for (let frame = 0; frame < Math.min(TOTAL_FRAMES, data.framesData.length); frame++) {
                    if (data.framesData[frame] && Array.isArray(data.framesData[frame])) {
                        for (let row = 0; row < Math.min(GRID_SIZE, data.framesData[frame].length); row++) {
                            if (data.framesData[frame][row] && Array.isArray(data.framesData[frame][row])) {
                                for (let col = 0; col < Math.min(GRID_SIZE, data.framesData[frame][row].length); col++) {
                                    if (data.framesData[frame][row][col] && typeof data.framesData[frame][row][col] === 'object') {
                                        // 깊은 복사로 데이터 복원
                                        framesData[frame][row][col] = JSON.parse(JSON.stringify(data.framesData[frame][row][col]));
                                    }
                                }
                            }
                        }
                    }
                }
                gridData = framesData[currentFrame];
            }
            // 이전 버전 호환성 (단일 프레임)
            else if (data.gridData && Array.isArray(data.gridData)) {
                // 모든 프레임 데이터 초기화
                for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
                    for (let row = 0; row < GRID_SIZE; row++) {
                        for (let col = 0; col < GRID_SIZE; col++) {
                            framesData[frame][row][col] = {};
                        }
                    }
                }
                
                // 첫 번째 프레임에만 데이터 복원
                for (let row = 0; row < Math.min(GRID_SIZE, data.gridData.length); row++) {
                    if (data.gridData[row] && Array.isArray(data.gridData[row])) {
                        for (let col = 0; col < Math.min(GRID_SIZE, data.gridData[row].length); col++) {
                            if (data.gridData[row][col] && typeof data.gridData[row][col] === 'object') {
                                // 깊은 복사로 데이터 복원
                                framesData[0][row][col] = JSON.parse(JSON.stringify(data.gridData[row][col]));
                            }
                        }
                    }
                }
                gridData = framesData[currentFrame];
            }
            
            // 레이어 색상 불러오기
            if (data.layers && Array.isArray(data.layers)) {
                data.layers.forEach(importedLayer => {
                    const layer = layers.find(l => l.id === importedLayer.id);
                    if (layer && importedLayer.color) {
                        layer.color = importedLayer.color;
                    }
                });
            }
            
            // 레이어 활성화 상태 불러오기
            if (data.layerActive && typeof data.layerActive === 'object') {
                Object.assign(layerActive, data.layerActive);
            }
            
            // UI 업데이트
            createLayerUI();
            drawCanvas();
            updateFrameUI();
            
            alert('패턴이 성공적으로 불러와졌습니다.');
            console.log('Pattern imported successfully');
        } catch (error) {
            alert('파일을 불러오는 중 오류가 발생했습니다.\n' + error.message);
            console.error('Import error:', error);
        }
    };
    
    reader.onerror = () => {
        alert('파일을 읽는 중 오류가 발생했습니다.');
    };
    
    reader.readAsText(file);
    
    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    importFile.value = '';
});

recordBtn.addEventListener('click', () => {
    alert('화면 녹화 기능은 구현 예정입니다.');
});

// 프레임 선택 UI 생성 (왼쪽 패널용 - 숨김 처리)
function createFrameSelector() {
    const container = document.getElementById('frameSelector');
    if (container) {
        container.style.display = 'none'; // 숨김
    }
}

// 프레임 썸네일 생성 (캔버스 하단)
function createFrameThumbnails() {
    const container = document.getElementById('frameThumbnails');
    if (!container) return;
    
    container.innerHTML = '';
    
    const thumbnailSize = 60; // 썸네일 크기
    
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.className = 'frame-thumbnail-wrapper';
        thumbnailWrapper.dataset.frame = i;
        
        if (i === currentFrame) {
            thumbnailWrapper.classList.add('active');
        }
        
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;
        thumbnailCanvas.className = 'frame-thumbnail';
        
        // 썸네일 그리기
        drawFrameThumbnail(thumbnailCanvas, i);
        
        const frameLabel = document.createElement('div');
        frameLabel.className = 'frame-label';
        frameLabel.textContent = i + 1;
        
        thumbnailWrapper.appendChild(thumbnailCanvas);
        thumbnailWrapper.appendChild(frameLabel);
        
        thumbnailWrapper.addEventListener('click', () => {
            switchToFrame(i);
        });
        
        container.appendChild(thumbnailWrapper);
    }
}

// 프레임 썸네일 그리기
function drawFrameThumbnail(canvas, frameIndex) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const scale = size / CANVAS_SIZE;
    const cellSize = CELL_SIZE * scale;
    
    // 배경 그리기
    if (backgroundImage && showBackgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, size, size);
    } else {
        // 흰 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
    }
    
    // 프레임 데이터로 그리기
    const frameData = framesData[frameIndex];
    
    layers.forEach(layer => {
        if (!layerActive[layer.id]) return;
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellData = frameData[row][col];
                if (cellData[layer.id]) {
                    const data = cellData[layer.id];
                    if (data.type === 'x-pattern') {
                        const x = col * cellSize;
                        const y = row * cellSize;
                        
                        // 1.25배 크게
                        const currentSize = CELL_SIZE - 4;
                        const newSize = currentSize * 1.25;
                        const margin = (CELL_SIZE - newSize) / 2;
                        const scaledMargin = margin * scale;
                        
                        ctx.strokeStyle = layer.color;
                        ctx.lineWidth = Math.max(1, 2.4 * scale); // 1.2배 굵게
                        ctx.lineCap = 'round'; // 꼭짓점 라운드
                        
                        ctx.beginPath();
                        ctx.moveTo(x + scaledMargin, y + scaledMargin);
                        ctx.lineTo(x + cellSize - scaledMargin, y + cellSize - scaledMargin);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(x + cellSize - scaledMargin, y + scaledMargin);
                        ctx.lineTo(x + scaledMargin, y + cellSize - scaledMargin);
                        ctx.stroke();
                    }
                }
            }
        }
    });
    
    // 그리드 그리기 (선택적)
    if (showGrid) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = Math.max(0.5, 1 * scale);
        
        for (let i = 0; i <= GRID_SIZE; i++) {
            const pos = i * cellSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
    }
}

// 프레임 전환
function switchToFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= TOTAL_FRAMES) return;
    
    // 현재 프레임 데이터 저장
    framesData[currentFrame] = gridData;
    
    // 새 프레임으로 전환
    currentFrame = frameIndex;
    gridData = framesData[currentFrame];
    
    // UI 업데이트
    updateFrameUI();
    drawCanvas();
    
    // 모든 썸네일 업데이트
    updateAllThumbnails();
}

// 프레임 UI 업데이트
function updateFrameUI() {
    // 왼쪽 패널 버튼 업데이트
    document.querySelectorAll('.frame-btn').forEach((btn, index) => {
        if (index === currentFrame) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 썸네일 업데이트
    document.querySelectorAll('.frame-thumbnail-wrapper').forEach((wrapper, index) => {
        if (index === currentFrame) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    });
    
    // 현재 프레임 썸네일 다시 그리기
    const currentThumbnail = document.querySelector(`.frame-thumbnail-wrapper[data-frame="${currentFrame}"] .frame-thumbnail`);
    if (currentThumbnail) {
        drawFrameThumbnail(currentThumbnail, currentFrame);
    }
    
    timeDisplay.textContent = `프레임 ${currentFrame + 1} / ${TOTAL_FRAMES}`;
}

// 재생 기능
function playAnimation() {
    if (isPlaying) {
        // 정지
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
        isPlaying = false;
        playBtn.textContent = '▶';
    } else {
        // 재생
        isPlaying = true;
        playBtn.textContent = '⏸';
        
        playInterval = setInterval(() => {
            // 현재 프레임 데이터 저장
            framesData[currentFrame] = gridData;
            
            // 다음 프레임으로
            currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
            gridData = framesData[currentFrame];
            
            updateFrameUI();
            drawCanvas();
        }, FRAME_DELAY);
    }
}

// GIF 저장
async function saveGIF() {
    try {
        saveGifBtn.disabled = true;
        saveGifBtn.textContent = 'GIF 생성 중...';
        
        // 각 프레임을 이미지로 변환
        const frames = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_SIZE;
        tempCanvas.height = CANVAS_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 현재 프레임 저장
        const savedFrame = currentFrame;
        const savedGridData = gridData;
        
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            // 해당 프레임의 데이터로 그리기
            const frameData = framesData[i];
            
            // 배경 그리기
            if (backgroundImage && showBackgroundImage) {
                tempCtx.drawImage(backgroundImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            } else {
                // 흰 배경
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }
            
            // 패턴 그리기
            layers.forEach(layer => {
                if (!layerActive[layer.id]) return;
                
                for (let row = 0; row < GRID_SIZE; row++) {
                    for (let col = 0; col < GRID_SIZE; col++) {
                        const cellData = frameData[row][col];
                        if (cellData[layer.id]) {
                            const data = cellData[layer.id];
                            if (data.type === 'x-pattern') {
                                drawXOnContext(tempCtx, row, col, layer.color);
                            }
                        }
                    }
                }
            });
            
            // 그리드 그리기 (선택적)
            if (showGrid) {
                drawGridOnContext(tempCtx);
            }
            
            frames.push(tempCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
        }
        
        // GIF 생성
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            repeat: 0 // 무한 반복
        });
        
        frames.forEach(frame => {
            gif.addFrame(frame, { delay: FRAME_DELAY });
        });
        
        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `pattern-animation-${Date.now()}.gif`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            saveGifBtn.disabled = false;
            saveGifBtn.textContent = 'GIF 저장';
            alert('GIF가 저장되었습니다!');
        });
        
        gif.render();
        
    } catch (error) {
        alert('GIF 저장 중 오류가 발생했습니다: ' + error.message);
        console.error('GIF save error:', error);
        saveGifBtn.disabled = false;
        saveGifBtn.textContent = 'GIF 저장';
    }
}

// 컨텍스트에 X 그리기
function drawXOnContext(ctx, row, col, color) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    
    // 1.25배 크게
    const currentSize = CELL_SIZE - 4;
    const newSize = currentSize * 1.25;
    const margin = (CELL_SIZE - newSize) / 2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4; // 1.2배 굵게 (2 * 1.2)
    ctx.lineCap = 'round'; // 꼭짓점 라운드
    
    ctx.beginPath();
    ctx.moveTo(x + margin, y + margin);
    ctx.lineTo(x + CELL_SIZE - margin, y + CELL_SIZE - margin);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE - margin, y + margin);
    ctx.lineTo(x + margin, y + CELL_SIZE - margin);
    ctx.stroke();
}

// 컨텍스트에 그리드 그리기
function drawGridOnContext(ctx) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        const pos = i * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
}

// 프레임 저장 버튼 생성
function createFrameSaveButtons() {
    const container = document.getElementById('frameSaveButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.width = '100%';
        btn.style.marginBottom = '8px';
        btn.textContent = `${i + 1}번 프레임 저장`;
        btn.dataset.frameIndex = i;
        
        btn.addEventListener('click', () => {
            const frameIndex = parseInt(btn.dataset.frameIndex);
            // 현재 프레임 데이터 저장
            framesData[currentFrame] = gridData;
            
            // 선택한 프레임의 패턴을 깊은 복사로 저장
            lastSavedFramePattern = JSON.parse(JSON.stringify(framesData[frameIndex]));
            lastSavedFrameIndex = frameIndex;
            
            alert(`${frameIndex + 1}번 프레임 패턴이 저장되었습니다.`);
        });
        
        container.appendChild(btn);
    }
}

// 최근 저장한 프레임을 현재 프레임에 import
importLastSavedBtn.addEventListener('click', () => {
    if (!lastSavedFramePattern) {
        alert('먼저 프레임을 저장해주세요.');
        return;
    }
    
    if (confirm(`현재 프레임의 패턴을 ${lastSavedFrameIndex + 1}번 프레임 패턴으로 덮어쓰시겠습니까?`)) {
        // 저장된 프레임 패턴을 현재 프레임에 복사
        framesData[currentFrame] = JSON.parse(JSON.stringify(lastSavedFramePattern));
        gridData = framesData[currentFrame];
        
        drawCanvas();
        updateFrameUI();
        updateAllThumbnails();
        
        alert(`${lastSavedFrameIndex + 1}번 프레임 패턴이 현재 프레임에 적용되었습니다.`);
    }
});

// Body 레이어 저장
saveBodyBtn.addEventListener('click', () => {
    // 현재 프레임 데이터 저장
    framesData[currentFrame] = gridData;
    
    // 모든 프레임에서 body 레이어 데이터 추출
    const bodyData = [];
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const frameBodyData = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowData = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellData = framesData[frame][row][col];
                if (cellData && cellData.body) {
                    rowData.push(JSON.parse(JSON.stringify({ body: cellData.body })));
                } else {
                    rowData.push({});
                }
            }
            frameBodyData.push(rowData);
        }
        bodyData.push(frameBodyData);
    }
    
    const data = {
        layerType: 'body',
        framesData: bodyData,
        totalFrames: TOTAL_FRAMES,
        version: '2.0'
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `body-pattern-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    alert('Body 레이어가 저장되었습니다.');
});

// Scarf 레이어 저장
saveScarfBtn.addEventListener('click', () => {
    // 현재 프레임 데이터 저장
    framesData[currentFrame] = gridData;
    
    // 모든 프레임에서 scarf 레이어 데이터 추출
    const scarfData = [];
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const frameScarfData = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowData = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellData = framesData[frame][row][col];
                if (cellData && cellData.scarf) {
                    rowData.push(JSON.parse(JSON.stringify({ scarf: cellData.scarf })));
                } else {
                    rowData.push({});
                }
            }
            frameScarfData.push(rowData);
        }
        scarfData.push(frameScarfData);
    }
    
    const data = {
        layerType: 'scarf',
        framesData: scarfData,
        totalFrames: TOTAL_FRAMES,
        version: '2.0'
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `scarf-pattern-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    alert('Scarf 레이어가 저장되었습니다.');
});

// Body 레이어 불러오기
importBodyBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.layerType === 'body' && data.framesData) {
                    // 모든 프레임에 body 레이어 데이터 적용
                    for (let frame = 0; frame < Math.min(TOTAL_FRAMES, data.framesData.length); frame++) {
                        if (data.framesData[frame]) {
                            for (let row = 0; row < Math.min(GRID_SIZE, data.framesData[frame].length); row++) {
                                if (data.framesData[frame][row]) {
                                    for (let col = 0; col < Math.min(GRID_SIZE, data.framesData[frame][row].length); col++) {
                                        // 셀 데이터 초기화
                                        if (!framesData[frame][row][col]) {
                                            framesData[frame][row][col] = {};
                                        }
                                        // body 레이어 데이터 복사 (깊은 복사)
                                        if (data.framesData[frame][row][col] && data.framesData[frame][row][col].body) {
                                            framesData[frame][row][col].body = JSON.parse(JSON.stringify(data.framesData[frame][row][col].body));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    gridData = framesData[currentFrame];
                    drawCanvas();
                    updateFrameUI();
                    updateAllThumbnails();
                    alert('Body 레이어가 불러와졌습니다.');
                } else {
                    alert('Body 레이어 파일이 아닙니다. (layerType: ' + (data.layerType || '없음') + ')');
                }
            } catch (error) {
                alert('파일을 불러오는 중 오류가 발생했습니다: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// Scarf 레이어 불러오기
importScarfBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.layerType === 'scarf' && data.framesData) {
                    // 모든 프레임에 scarf 레이어 데이터 적용
                    for (let frame = 0; frame < Math.min(TOTAL_FRAMES, data.framesData.length); frame++) {
                        if (data.framesData[frame]) {
                            for (let row = 0; row < Math.min(GRID_SIZE, data.framesData[frame].length); row++) {
                                if (data.framesData[frame][row]) {
                                    for (let col = 0; col < Math.min(GRID_SIZE, data.framesData[frame][row].length); col++) {
                                        // 셀 데이터 초기화
                                        if (!framesData[frame][row][col]) {
                                            framesData[frame][row][col] = {};
                                        }
                                        // scarf 레이어 데이터 복사 (깊은 복사)
                                        if (data.framesData[frame][row][col] && data.framesData[frame][row][col].scarf) {
                                            framesData[frame][row][col].scarf = JSON.parse(JSON.stringify(data.framesData[frame][row][col].scarf));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    gridData = framesData[currentFrame];
                    drawCanvas();
                    updateFrameUI();
                    updateAllThumbnails();
                    alert('Scarf 레이어가 불러와졌습니다.');
                } else {
                    alert('Scarf 레이어 파일이 아닙니다. (layerType: ' + (data.layerType || '없음') + ')');
                }
            } catch (error) {
                alert('파일을 불러오는 중 오류가 발생했습니다: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// 그리드 토글
toggleGridBtn.addEventListener('click', () => {
    showGrid = !showGrid;
    toggleGridBtn.textContent = showGrid ? '그리드 숨기기' : '그리드 표시';
    drawCanvas();
});

// 재생 버튼
playBtn.addEventListener('click', playAnimation);

// GIF 저장 버튼
saveGifBtn.addEventListener('click', saveGIF);

// 배경 이미지 업로드
uploadBgImageBtn.addEventListener('click', () => {
    bgImageFile.click();
});

bgImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                backgroundImage = img;
                showBackgroundImage = true;
                toggleBgImageBtn.textContent = '이미지 숨기기';
                drawCanvas();
                // 모든 프레임 썸네일 업데이트
                updateAllThumbnails();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('이미지 파일을 선택해주세요.');
    }
});

// 배경 이미지 숨기기/보이기 토글
toggleBgImageBtn.addEventListener('click', () => {
    if (!backgroundImage) {
        alert('먼저 이미지를 업로드해주세요.');
        return;
    }
    
    showBackgroundImage = !showBackgroundImage;
    toggleBgImageBtn.textContent = showBackgroundImage ? '이미지 숨기기' : '이미지 보이기';
    drawCanvas();
    // 모든 프레임 썸네일 업데이트
    updateAllThumbnails();
});

// 배경 이미지 제거
removeBgImageBtn.addEventListener('click', () => {
    backgroundImage = null;
    showBackgroundImage = true;
    toggleBgImageBtn.textContent = '이미지 숨기기';
    drawCanvas();
    // 모든 프레임 썸네일 업데이트
    updateAllThumbnails();
});


// 모든 썸네일 업데이트
function updateAllThumbnails() {
    document.querySelectorAll('.frame-thumbnail').forEach((canvas, index) => {
        drawFrameThumbnail(canvas, index);
    });
}

// 탭 전환
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // 모든 탭 버튼과 콘텐츠 비활성화
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // 선택한 탭 활성화
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
});

// 초기화
createToolUI();
createFrameSelector();
createFrameSaveButtons();
createFrameThumbnails();
createLayerUI(); // 레이어 UI는 선택적
toggleGridBtn.textContent = showGrid ? '그리드 숨기기' : '그리드 표시';
drawCanvas();
drawGridNumbers();
updateFrameUI();

// ========== Music Motion Tab ==========

// Music Motion 관련 변수
const musicCanvas = document.getElementById('musicCanvas');
const musicCtx = musicCanvas ? musicCanvas.getContext('2d') : null;
let musicMotionAudio = null;
let musicMotionFrames = [null, null, null]; // 3개의 모션 프레임 데이터
let musicBodyColor = '#ff3c32';
let musicScarfColor = '#ff3c32';
let musicIsPlaying = false;
let musicAnimationFrame = null;
let musicShowGrid = true; // Music Motion 탭의 그리드 표시 여부
let musicRecorder = null;
let musicRecordedChunks = [];
let musicIsRecording = false;

// Web Audio API 관련
let musicAudioContext = null;
let musicAnalyser = null;
let musicSource = null;
let musicFrequencyData = null;
let musicSmoothedEnergy = 0; // 평활화된 에너지 레벨

if (musicCanvas && musicCtx) {
    musicCanvas.width = CANVAS_SIZE;
    musicCanvas.height = CANVAS_SIZE;
}

// Music Motion 탭 초기화
function initMusicMotionTab() {
    if (!musicCanvas) {
        console.warn('Music canvas not found');
        return;
    }
    
    // 음악 파일 업로드
    const uploadMusicMotionBtn = document.getElementById('uploadMusicMotionBtn');
    const musicMotionFile = document.getElementById('musicMotionFile');
    
    if (uploadMusicMotionBtn && musicMotionFile) {
        // 음악 업로드 버튼 이벤트 리스너
        uploadMusicMotionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            musicMotionFile.click();
        });
        
        musicMotionFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                
                // 기존 오디오 정리
                if (musicMotionAudio) {
                    musicMotionAudio.pause();
                    musicMotionAudio = null;
                }
                if (musicSource) {
                    musicSource.disconnect();
                    musicSource = null;
                }
                if (musicAudioContext) {
                    musicAudioContext.close();
                    musicAudioContext = null;
                }
                
                // Audio 생성 및 Web Audio API 설정
                musicMotionAudio = new Audio(url);
                musicMotionAudio.loop = true;
                
                // AudioContext 생성
                musicAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                musicAnalyser = musicAudioContext.createAnalyser();
                musicAnalyser.fftSize = 256; // 주파수 분석 크기
                musicAnalyser.smoothingTimeConstant = 0.8; // 평활화 계수
                
                musicSource = musicAudioContext.createMediaElementSource(musicMotionAudio);
                musicSource.connect(musicAnalyser);
                musicAnalyser.connect(musicAudioContext.destination);
                
                musicFrequencyData = new Uint8Array(musicAnalyser.frequencyBinCount);
                musicSmoothedEnergy = 0;
                
                const infoDiv = document.getElementById('musicMotionInfo');
                if (infoDiv) {
                    infoDiv.textContent = `파일: ${file.name}`;
                }
            }
        });
    }
    
    // 모션 패턴 불러오기
    const motionImportBtns = document.querySelectorAll('.motion-import-btn');
    
    motionImportBtns.forEach((btn) => {
        // 각 버튼에 고유한 파일 입력 요소 생성
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        const motionIndex = parseInt(btn.dataset.motion);
        
        btn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.framesData && Array.isArray(data.framesData)) {
                        musicMotionFrames[motionIndex] = JSON.parse(JSON.stringify(data.framesData));
                        
                        // 파일 이름 표시
                        const fileNameDiv = document.querySelector(`.motion-file-name[data-motion="${motionIndex}"]`);
                        if (fileNameDiv) {
                            fileNameDiv.textContent = `파일: ${file.name}`;
                        }
                        
                        alert(`모션 ${motionIndex + 1}이 불러와졌습니다.`);
                        drawMusicCanvas();
                    } else {
                        alert('올바른 패턴 파일이 아닙니다.');
                    }
                } catch (error) {
                    alert('파일을 불러오는 중 오류가 발생했습니다: ' + error.message);
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // 같은 파일을 다시 선택할 수 있도록
        });
    });
    
    // 색상 선택기
    const musicBodyColorPicker = document.getElementById('musicBodyColorPicker');
    const musicScarfColorPicker = document.getElementById('musicScarfColorPicker');
    
    if (musicBodyColorPicker) {
        musicBodyColorPicker.addEventListener('change', (e) => {
            musicBodyColor = e.target.value;
            drawMusicCanvas();
        });
    }
    
    if (musicScarfColorPicker) {
        musicScarfColorPicker.addEventListener('change', (e) => {
            musicScarfColor = e.target.value;
            drawMusicCanvas();
        });
    }
    
    // 재생 버튼
    const musicPlayBtn = document.getElementById('musicPlayBtn');
    if (musicPlayBtn) {
        musicPlayBtn.addEventListener('click', () => {
            if (!musicMotionAudio) {
                alert('먼저 음악 파일을 업로드해주세요.');
                return;
            }
            
            if (musicIsPlaying) {
                musicMotionAudio.pause();
                musicIsPlaying = false;
                musicPlayBtn.textContent = '▶';
                if (musicAnimationFrame) {
                    cancelAnimationFrame(musicAnimationFrame);
                }
            } else {
                // AudioContext 시작 (사용자 상호작용 필요)
                if (musicAudioContext && musicAudioContext.state === 'suspended') {
                    musicAudioContext.resume();
                }
                
                musicMotionAudio.play().then(() => {
                    musicIsPlaying = true;
                    musicPlayBtn.textContent = '⏸';
                    startMusicAnimation();
                }).catch(error => {
                    console.error('재생 오류:', error);
                    alert('음악 재생 중 오류가 발생했습니다.');
                });
            }
        });
    }
    
    // 그리드 토글 버튼
    const musicToggleGridBtn = document.getElementById('musicToggleGridBtn');
    if (musicToggleGridBtn) {
        musicToggleGridBtn.textContent = musicShowGrid ? '그리드 숨기기' : '그리드 표시';
        musicToggleGridBtn.addEventListener('click', () => {
            musicShowGrid = !musicShowGrid;
            musicToggleGridBtn.textContent = musicShowGrid ? '그리드 숨기기' : '그리드 표시';
            drawMusicCanvas();
        });
    }
    
    // 화면 녹화 버튼
    const musicRecordBtn = document.getElementById('musicRecordBtn');
    if (musicRecordBtn) {
        musicRecordBtn.addEventListener('click', async () => {
            if (!musicCanvas) {
                alert('캔버스를 찾을 수 없습니다.');
                return;
            }
            
            if (musicIsRecording) {
                // 녹화 중지
                if (musicRecorder && musicRecorder.state !== 'inactive') {
                    musicRecorder.stop();
                }
                musicRecordBtn.textContent = '화면 녹화';
                musicIsRecording = false;
            } else {
                // 녹화 시작
                try {
                    const stream = musicCanvas.captureStream(30); // 30fps
                    musicRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm;codecs=vp9'
                    });
                    
                    musicRecordedChunks = [];
                    
                    musicRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            musicRecordedChunks.push(event.data);
                        }
                    };
                    
                    musicRecorder.onstop = () => {
                        const blob = new Blob(musicRecordedChunks, { type: 'video/webm' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = `music-motion-recording-${Date.now()}.webm`;
                        link.href = url;
                        link.click();
                        URL.revokeObjectURL(url);
                        musicRecordedChunks = [];
                    };
                    
                    musicRecorder.start();
                    musicRecordBtn.textContent = '녹화 중지';
                    musicIsRecording = true;
                } catch (error) {
                    console.error('녹화 시작 오류:', error);
                    alert('녹화를 시작할 수 없습니다: ' + error.message);
                    
                    // WebM을 지원하지 않는 경우 MP4 시도
                    try {
                        const stream = musicCanvas.captureStream(30);
                        musicRecorder = new MediaRecorder(stream);
                        musicRecordedChunks = [];
                        
                        musicRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                musicRecordedChunks.push(event.data);
                            }
                        };
                        
                        musicRecorder.onstop = () => {
                            const blob = new Blob(musicRecordedChunks, { type: 'video/webm' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.download = `music-motion-recording-${Date.now()}.webm`;
                            link.href = url;
                            link.click();
                            URL.revokeObjectURL(url);
                            musicRecordedChunks = [];
                        };
                        
                        musicRecorder.start();
                        musicRecordBtn.textContent = '녹화 중지';
                        musicIsRecording = true;
                    } catch (error2) {
                        alert('이 브라우저는 화면 녹화를 지원하지 않습니다.');
                    }
                }
            }
        });
    }
    
    // 초기 캔버스 그리기
    drawMusicCanvas();
}

// 음악 분석하여 모션 선택 (0: 느림, 1: 중간, 2: 빠름)
function analyzeMusicMotion() {
    if (!musicAnalyser || !musicFrequencyData) {
        return 1; // 기본값: 중간
    }
    
    // 주파수 데이터 가져오기
    musicAnalyser.getByteFrequencyData(musicFrequencyData);
    
    // 주파수 대역별 에너지 계산
    const totalBins = musicFrequencyData.length;
    const bassEnd = Math.floor(totalBins * 0.1); // 낮은 주파수 (베이스)
    const midEnd = Math.floor(totalBins * 0.5);  // 중간 주파수
    const trebleStart = Math.floor(totalBins * 0.6); // 높은 주파수 (트레블)
    
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    
    for (let i = 0; i < bassEnd; i++) {
        bassEnergy += musicFrequencyData[i];
    }
    for (let i = bassEnd; i < midEnd; i++) {
        midEnergy += musicFrequencyData[i];
    }
    for (let i = trebleStart; i < totalBins; i++) {
        trebleEnergy += musicFrequencyData[i];
    }
    
    // 전체 에너지
    const totalEnergy = bassEnergy + midEnergy + trebleEnergy;
    
    // 평활화 (부드러운 전환을 위해)
    musicSmoothedEnergy = musicSmoothedEnergy * 0.7 + totalEnergy * 0.3;
    
    // 트레블/베이스 비율 (높을수록 경쾌하고 빠름)
    const trebleRatio = trebleEnergy / (bassEnergy + 1); // +1로 0으로 나누는 것 방지
    
    // 에너지와 트레블 비율을 결합하여 모션 선택
    // 모션 3 (빠름): 높은 에너지 + 높은 트레블 비율
    // 모션 2 (중간): 중간 에너지
    // 모션 1 (느림): 낮은 에너지 + 낮은 트레블 비율
    
    const normalizedEnergy = Math.min(musicSmoothedEnergy / 5000, 1); // 에너지 정규화 (최대값은 조정 가능)
    const normalizedTreble = Math.min(trebleRatio / 2, 1); // 트레블 비율 정규화
    
    // 가중 평균으로 모션 결정 (0-2)
    const motionScore = normalizedEnergy * 0.6 + normalizedTreble * 0.4;
    
    if (motionScore < 0.33) {
        return 0; // 모션 1 (느림)
    } else if (motionScore < 0.66) {
        return 1; // 모션 2 (중간)
    } else {
        return 2; // 모션 3 (빠름)
    }
}

// Music Canvas 그리기
function drawMusicCanvas() {
    if (!musicCtx || !musicCanvas) return;
    
    // 배경
    musicCtx.fillStyle = '#ffffff';
    musicCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // 현재 재생 중인 모션에 따라 프레임 그리기
    if (musicIsPlaying && musicMotionAudio && musicAnalyser) {
        // 음악 분석으로 모션 선택
        const motionIndex = analyzeMusicMotion();
        
        // 각 모션 내에서 프레임 선택 (시간 기반)
        const timeProgress = (musicMotionAudio.currentTime % 1); // 1초 단위
        const frameIndex = Math.min(Math.floor(timeProgress * 6), 5); // 각 모션은 6프레임
        
        if (musicMotionFrames[motionIndex] && musicMotionFrames[motionIndex][frameIndex]) {
            drawMusicFrame(musicMotionFrames[motionIndex][frameIndex]);
        }
    } else {
        // 정지 상태: 첫 번째 모션의 첫 번째 프레임 표시
        if (musicMotionFrames[0] && musicMotionFrames[0][0]) {
            drawMusicFrame(musicMotionFrames[0][0]);
        }
    }
    
    // 그리드 그리기
    drawMusicGrid();
}

// Music Frame 그리기
function drawMusicFrame(frameData) {
    if (!musicCtx || !frameData) return;
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellData = frameData[row][col];
            if (cellData) {
                if (cellData.body) {
                    drawMusicX(row, col, musicBodyColor);
                }
                if (cellData.scarf) {
                    drawMusicX(row, col, musicScarfColor);
                }
            }
        }
    }
}

// Music X 패턴 그리기
function drawMusicX(row, col, color) {
    if (!musicCtx) return;
    
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const margin = 1.5;
    
    musicCtx.strokeStyle = color;
    musicCtx.lineWidth = 2.4;
    musicCtx.lineCap = 'round';
    
    musicCtx.beginPath();
    musicCtx.moveTo(x + margin, y + margin);
    musicCtx.lineTo(x + CELL_SIZE - margin, y + CELL_SIZE - margin);
    musicCtx.stroke();
    
    musicCtx.beginPath();
    musicCtx.moveTo(x + CELL_SIZE - margin, y + margin);
    musicCtx.lineTo(x + margin, y + CELL_SIZE - margin);
    musicCtx.stroke();
}

// Music 그리드 그리기
function drawMusicGrid() {
    if (!musicCtx || !musicShowGrid) return;
    
    musicCtx.strokeStyle = '#e0e0e0';
    musicCtx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        musicCtx.beginPath();
        musicCtx.moveTo(i * CELL_SIZE, 0);
        musicCtx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        musicCtx.stroke();
        
        musicCtx.beginPath();
        musicCtx.moveTo(0, i * CELL_SIZE);
        musicCtx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        musicCtx.stroke();
    }
}

// Music 애니메이션 시작
function startMusicAnimation() {
    if (!musicIsPlaying) return;
    
    drawMusicCanvas();
    
    const musicTimeDisplay = document.getElementById('musicTimeDisplay');
    if (musicTimeDisplay && musicMotionAudio) {
        const currentTime = Math.floor(musicMotionAudio.currentTime);
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        musicTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    musicAnimationFrame = requestAnimationFrame(startMusicAnimation);
}

// Music Motion 탭 초기화
initMusicMotionTab();