
const modelUrl = './config.json';
const app = Vue.createApp({
    el: "#app",
    data() {
        return {
            boardRows: 4,
            boardCols: 4,
            boardRowsTmp: 4,
            boardColsTmp: 4,
            boardGenerated: false,
            rowTargets: [],
            colTargets: [],
            row2Targets: [],
            col2Targets: [],
            type2Enabled: false,
            useButton: false,
            cells: [],
            components: [],
            calculateRunning: false,
            answerPlaced: false,
            calculateResultMessage: "",
            placeResult: null,
            modelLoaded: false,
            placedInstances: [],
            presets: {},
            presetList: [],
            presetSearchText: "",
            selectedPresetId: null,
        };
    },
    methods: {
        async loadComponentsFromServer(){
            try {
                const res = await fetch(`./config.json?t=${Date.now()}`);
                if(!res.ok) throw new Error('加载组件定义失败');
                const json = await res.json();

                this.components = Object.entries(json).map(([id, item]) => {
                    let coords = item.shape.map(pair => pair.join(','));
                    let minX = Math.min(...item.shape.map(p => p[0]));
                    let maxX = Math.max(...item.shape.map(p => p[0]));
                    let minY = Math.min(...item.shape.map(p => p[1]));
                    let maxY = Math.max(...item.shape.map(p => p[1]));
                    let normShape = new Set();
                    item.shape.forEach(([x,y]) => {
                        normShape.add((x - minX) + ',' + (y - minY));
                    });
                    return {
                        id: id,
                        name: item.name,
                        shapeSet: normShape,
                        color: item.color || '#ccc',
                        count: 0,
                        count2: 0,
                        sizeRows: maxX - minX + 1,
                        sizeCols: maxY - minY + 1,
                        rawShape: new Set(coords),
                    }
                });

                this.modelLoaded = true;
                this.calculateResultMessage = "组件列表已更新";
            } catch(e){
                alert(e.message || "更新组件列表失败");
            }
        },

        async loadPresetsFromServer(){
            try {
                const res = await fetch(`./presets.json?t=${Date.now()}`);
                if(!res.ok) throw new Error('加载预设文件失败');
                const json = await res.json();
                
                this.presets = json;
                this.processPresetList();
            } catch(e){
                console.warn('加载预设失败:', e.message);
                this.presets = {};
                this.presetList = [];
            }
        },

        processPresetList(){
            let filtered = Object.entries(this.presets)
                .filter(([id, preset]) => 
                    preset.name && 
                    preset.name.toLowerCase().includes(this.presetSearchText.toLowerCase())
                )
                .sort((a, b) => a[1].name.localeCompare(b[1].name, 'zh'));
            
            this.presetList = filtered.map(([id, preset]) => ({
                id,
                name: preset.name,
                preset
            }));
        },

        onPresetSearchInput(){
            this.processPresetList();
            this.selectedPresetId = null;
        },
        onRowsChange() {
            this.boardColsTmp = this.boardRowsTmp;
        },

        selectPreset(presetId){
            this.selectedPresetId = this.selectedPresetId === presetId ? null : presetId;
        },

        onButtonModeToggls() {
            if (this.calculateRunning) {
                alert('计算中无法切换输入模式');
                this.useButton = !this.useButton;
                return;
            }
        },

        incrementTarget(type, index, maxValue) {
            if (this.calculateRunning) return;
            if (type === 'row') {
                this.rowTargets[index] = (this.rowTargets[index] + 1) % (maxValue + 1);
                this.$set(this.rowTargets, index, this.rowTargets[index]);
            } else if (type === 'row2') {
                this.row2Targets[index] = (this.row2Targets[index] + 1) % (maxValue + 1);
                this.$set(this.row2Targets, index, this.row2Targets[index]);
            } else if (type === 'col') {
                this.colTargets[index] = (this.colTargets[index] + 1) % (maxValue + 1);
                this.$set(this.colTargets, index, this.colTargets[index]);
            } else if (type === 'col2') {
                this.col2Targets[index] = (this.col2Targets[index] + 1) % (maxValue + 1);
                this.$set(this.col2Targets, index, this.col2Targets[index]);
            }
        },

        decrementTarget(type, index, maxValue) {
            if (this.calculateRunning) return;
            if (type === 'row') {
                this.rowTargets[index] = (this.rowTargets[index] - 1 + maxValue + 1) % (maxValue + 1);
                this.$set(this.rowTargets, index, this.rowTargets[index]);
            } else if (type === 'row2') {
                this.row2Targets[index] = (this.row2Targets[index] - 1 + maxValue + 1) % (maxValue + 1);
                this.$set(this.row2Targets, index, this.row2Targets[index]);
            } else if (type === 'col') {
                this.colTargets[index] = (this.colTargets[index] - 1 + maxValue + 1) % (maxValue + 1);
                this.$set(this.colTargets, index, this.colTargets[index]);
            } else if (type === 'col2') {
                this.col2Targets[index] = (this.col2Targets[index] - 1 + maxValue + 1) % (maxValue + 1);
                this.$set(this.col2Targets, index, this.col2Targets[index]);
            }
        },


        refreshComponents(){
            if(this.calculateRunning){
                alert('计算中无法刷新组件列表');
                return;
            }
            if(confirm('确定要清理本地缓存并刷新组件列表吗？')){
                this.modelLoaded = false;
                this.loadComponentsFromServer();
                this.components.forEach(c => {
                    c.count = 0;
                    c.count2 = 0;
                });
                this.calculateResultMessage = "";
            }
        },
        refreshPresets(){
            if(this.calculateRunning){
                alert('计算中无法刷新组件列表');
                return;
            }
            if(confirm('确定要清理本地缓存并刷新预设列表吗？')){
                this.loadPresetsFromServer();
                this.calculateResultMessage = "";
            }
        },
        setComponentCountType1(id, cnt) {
            const comp = this.components.find(c => c.id === id);
            if(comp) comp.count = cnt;
        },
        setComponentCountType2(id, cnt) {
            const comp = this.components.find(c => c.id === id);
            if(comp) comp.count2 = cnt;
        },
        async generateBoard() {
            const rows = this.boardRowsTmp;
            const cols = this.boardColsTmp;
            if (!rows || rows < 1 || rows > 10 || !cols || cols < 1 || cols > 10) return;
            this.boardRows = rows;
            this.boardCols = cols;
            if(!this.modelLoaded){
                await this.loadComponentsFromServer();
            }
            this.boardGenerated = true;
            this.calculateResultMessage = "";
            this.answerPlaced = false;
            this.rowTargets = Array(this.boardRows).fill(0);
            this.colTargets = Array(this.boardCols).fill(0);
            this.row2Targets = Array(this.boardRows).fill(0);
            this.col2Targets = Array(this.boardCols).fill(0);
            this.cells = [];
            for (let r = 0; r < this.boardRows; r++) {
                for (let c = 0; c < this.boardCols; c++) {
                    this.cells.push({
                        r,
                        c,
                        state: 0,
                        disabled: false,
                        placed: false,
                        compId: null
                    });
                }
            }
            this.components.forEach(c => {
                c.count = 0;
                c.count2 = 0;
            });
        },

        validateTarget(type, idx) {
            if(type==='row'){
                if(this.rowTargets[idx] < 0) this.rowTargets[idx] = 0;
                if(this.rowTargets[idx] > this.boardCols) this.rowTargets[idx] = this.boardCols;
            } else if(type==='row2'){
                if(this.row2Targets[idx] < 0) this.row2Targets[idx] = 0;
                if(this.row2Targets[idx] > this.boardCols) this.row2Targets[idx] = this.boardCols;
            } else if(type==='col'){
                if(this.colTargets[idx] < 0) this.colTargets[idx] = 0;
                if(this.colTargets[idx] > this.boardRows) this.colTargets[idx] = this.boardRows;
            } else if(type==='col2'){
                if(this.col2Targets[idx] < 0) this.col2Targets[idx] = 0;
                if(this.col2Targets[idx] > this.boardRows) this.col2Targets[idx] = this.boardRows;
            }
        },

        toggleDisableCell(cell) {
            if(this.calculateRunning) return;
            if(this.answerPlaced){
                let resetConfirm = confirm(
                    '当前已有计算结果, 修改禁用格子将导致答案失效\n是否重置答案? 点击"确定"将重置答案，点击"取消"将取消修改'
                );
                if(resetConfirm){
                    this.resetAnswer();
                } else {
                    return;
                }
            }
            
            if(this.type2Enabled){
                cell.state = (cell.state + 1) % 4;
            } else {
                cell.state = (cell.state + 1) % 3;
            }
            
            if(cell.state !== 0){
                cell.placed = false;
                cell.compId = null;
                cell.compInstanceId = null;
            }
        },
        
        async exportPreset() {
            if (!this.answerPlaced || this.calculateRunning){
                if(!this.answerPlaced) alert("未计算出答案的预设无法导出");
                return;
            }
            const confirmReset = confirm("导出预设将重置当前答案, 是否继续? ");
            if (!confirmReset) return;
            const R = {};
            this.resetAnswer();
            const name = prompt("请输入此预设的名称");
            if (!name) {
                alert("预设名称不能为空");
                return;
            }
            R.name = name;
            R.n = this.boardRows;
            R.m = this.boardCols;
            R.isType2Activated = this.type2Enabled;
            R.target = {
                row: this.rowTargets.slice(),
                col: this.colTargets.slice(),
                row2: this.type2Enabled ? this.row2Targets.slice() : Array(this.boardRows).fill(0),
                col2: this.type2Enabled ? this.col2Targets.slice() : Array(this.boardCols).fill(0),
            };
            R.gridCell = this.cells
                .filter(cell => (cell.state != 0))
                .map(cell => ({
                r: cell.r,
                c: cell.c,
                state: cell.state
            }));
            R.component = this.components
                .filter(c => (c.count > 0 || (this.type2Enabled && c.count2 > 0)))
                .map(c => ({
                id: c.id,
                count: c.count,
                count2: this.type2Enabled ? c.count2 : 0
            }));
            try {
                await navigator.clipboard.writeText(JSON.stringify(R));
                alert("预设数据已复制到剪贴板");
            } catch (err) {
                alert("复制到剪贴板失败, 请手动复制：\n" + JSON.stringify(R, null, 4));
            }
        },

        importPreset() {
            if(this.calculateRunning){
                alert('计算中无法导入预设');
                return;
            }

            const jsonString = prompt('请输入预设');
            if (jsonString === null) return;
            if (!jsonString.trim()) {
                alert('请输入有效的JSON数据');
                return;
            }
            
            try {
                const presetInfo = JSON.parse(jsonString);
                if (!presetInfo.n || !presetInfo.m || !presetInfo.name || !presetInfo.target || !presetInfo.gridCell || !presetInfo.component) {
                    alert('非法JSON');
                    return;
                }
                this.loadPreset(presetInfo);
                
            } catch (e) {
                if (e instanceof SyntaxError) {
                    alert('JSON格式错误');
                } else {
                    alert(`导入失败: ${e.message}`);
                }
            }
        },

        async loadPreset(presetInfo) {
            if (!presetInfo) {
                alert('预设数据不存在');
                return false;
            }

            const confirmApply = confirm('导入预设将覆盖全部内容, 未保存的内容可能会丢失, 是否继续? ');
            if (!confirmApply) return false;

            try {
                this.resetAll();
                this.boardRowsTmp = presetInfo.n;
                this.boardColsTmp = presetInfo.m || presetInfo.n;
                this.boardRows = presetInfo.n;
                this.boardCols = presetInfo.m || presetInfo.n;
                this.type2Enabled = presetInfo.isType2Activated || false;
                const N = this.boardRows;
                const M = this.boardCols;
                
                this.cells = [];
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < M; c++) {
                        this.cells.push({
                            r,
                            c,
                            state: 0,
                            disabled: false,
                            placed: false,
                            compId: null,
                            compInstanceId: null,
                        });
                    }
                }
                
                if(presetInfo.gridCell && Array.isArray(presetInfo.gridCell)){
                    presetInfo.gridCell.forEach(cellData => {
                        if(cellData.r >= 0 && cellData.r < N && cellData.c >= 0 && cellData.c < M){
                            const idx = cellData.r * M + cellData.c;
                            if(this.cells[idx]){
                                this.cells[idx].state = cellData.state || 0;
                            }
                        }
                    });
                }
                
                this.rowTargets = presetInfo.target?.row?.slice() || Array(N).fill(0);
                this.colTargets = presetInfo.target?.col?.slice() || Array(M).fill(0);
                this.row2Targets = presetInfo.target?.row2?.slice() || Array(N).fill(0);
                this.col2Targets = presetInfo.target?.col2?.slice() || Array(M).fill(0);
                
                this.components.forEach(c => {
                    c.count = 0;
                    c.count2 = 0;
                });
                
                if(presetInfo.component && Array.isArray(presetInfo.component)){
                    presetInfo.component.forEach(compData => {
                        const comp = this.components.find(c => c.id === compData.id);
                        if(comp){
                            comp.count = compData.count || 0;
                            if(this.type2Enabled){
                                comp.count2 = compData.count2 || 0;
                            }
                        }
                    });
                }
                
                this.boardGenerated = true;
                this.calculateResultMessage = `已加载预设: ${presetInfo.name || '导入的预设'}`;
                this.selectedPresetId = null;
                this.processPresetList();
                return true;
            } catch(e) {
                alert(`应用预设失败: ${e.message}`);
                return false;
            }
        },

        async applyPreset(){
            if(!this.selectedPresetId){
                alert('请选择一个预设');
                return;
            }
            
            const selectedPreset = this.presets[this.selectedPresetId];
            this.loadPreset(selectedPreset);
        },

        async startCalculation() {
            this.calculateResultMessage = "";
            
            const N = this.boardRows;
            const M = this.boardCols;

            if (this.rowTargets.some(v => v < 0 || v > M) ||
                this.colTargets.some(v => v < 0 || v > N)) {
                this.calculateResultMessage = "输入错误: 绿色组件行列目标数字超出范围";
                return;
            }
            if (this.type2Enabled) {
                if (this.row2Targets.some(v => v < 0 || v > M) ||
                    this.col2Targets.some(v => v < 0 || v > N)) {
                    this.calculateResultMessage = "输入错误: 蓝色组件行列目标数字超出范围";
                    return;
                }
            }

            const rowTargets = this.rowTargets.slice();
            const colTargets = this.colTargets.slice();
            const row2Targets = this.type2Enabled ? this.row2Targets.slice() : Array(N).fill(0);
            const col2Targets = this.type2Enabled ? this.col2Targets.slice() : Array(M).fill(0);

            const totalNeeded = rowTargets.reduce((a, b) => a + b, 0);
            const sumCol = colTargets.reduce((a, b) => a + b, 0);
            if (totalNeeded !== sumCol) {
                this.calculateResultMessage = "输入错误: 绿色组件行/列目标之和不相等";
                return;
            }
            const totalNeeded2 = row2Targets.reduce((a, b) => a + b, 0);
            const sumCol2 = col2Targets.reduce((a, b) => a + b, 0);
            if (totalNeeded2 !== sumCol2) {
                this.calculateResultMessage = "输入错误: 蓝色组件行/列目标之和不相等";
                return;
            }

            this.calculateRunning = true;
            try {
                this.cells.forEach(cell => {
                    cell.placed = false;
                    cell.compId = null;
                    cell.compInstanceId = null;
                });
                this.answerPlaced = false;
                this.placedInstances = [];

                const board = Array.from({ length: N }, () => Array(M).fill(0));
                let totalEmpty = 0;

                const rowLitCount = Array(N).fill(0);
                const colLitCount = Array(M).fill(0);
                const rowLit2Count = Array(N).fill(0);
                const colLit2Count = Array(M).fill(0);

                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < M; c++) {
                        const cell = this.cells[r * M + c];
                        if (cell.state === 0) {
                            board[r][c] = 0;
                            totalEmpty++;
                        } else {
                            board[r][c] = -1;
                            if (cell.state === 2) {
                                rowLitCount[r]++;
                                colLitCount[c]++;
                            } else if (cell.state === 3) {
                                rowLit2Count[r]++;
                                colLit2Count[c]++;
                            }
                        }
                    }
                }

                for (let i = 0; i < N; i++) {
                    if (rowLitCount[i] > rowTargets[i]) {
                        this.calculateResultMessage = "输入错误: 某行的绿色组件锁定常亮格大于需求量";
                        this.calculateRunning = false;
                        return;
                    }
                    if (rowLit2Count[i] > row2Targets[i]) {
                        this.calculateResultMessage = "输入错误: 某行的蓝色组件锁定常亮格大于需求量";
                        this.calculateRunning = false;
                        return;
                    }
                }

                for (let i = 0; i < M; i++){
                    if (colLitCount[i] > colTargets[i]) {
                        this.calculateResultMessage = "输入错误: 某列的绿色组件锁定常亮格大于需求量";
                        this.calculateRunning = false;
                        return;
                    }
                    if (colLit2Count[i] > col2Targets[i]) {
                        this.calculateResultMessage = "输入错误: 某列的蓝色组件锁定常亮格大于需求量";
                        this.calculateRunning = false;
                        return;
                    }
                }

                const boardSatisfiedNow = () => {
                    for (let i = 0; i < N; i++) {
                        if (rowLitCount[i] !== rowTargets[i]) return false;
                        if (rowLit2Count[i] !== row2Targets[i]) return false;
                    }
                    for(let i = 0; i < M; i++){
                        if (colLitCount[i] !== colTargets[i]) return false;
                        if (colLit2Count[i] !== col2Targets[i]) return false;
                    }
                    return true;
                };

                if (boardSatisfiedNow()) {
                    this.calculateResultMessage = "无需放置组件: 需求已满足";
                    this.answerPlaced = true;
                    this.calculateRunning = false;
                    return;
                }

                let currentGreens = rowLitCount.reduce((a, b) => a + b, 0);
                let currentBlues = rowLit2Count.reduce((a, b) => a + b, 0);
                if (totalEmpty < (totalNeeded - currentGreens) + (totalNeeded2 - currentBlues)) {
                    this.calculateResultMessage = "无解: 可用格不足";
                    this.calculateRunning = false;
                    return;
                }

                const rowEmptyCount = Array(N).fill(0);
                const colEmptyCount = Array(M).fill(0);
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < M; c++) {
                        if (board[r][c] === 0) {
                            rowEmptyCount[r]++;
                            colEmptyCount[c]++;
                        }
                    }
                }

                const shapeSetToArray = (shapeSet) => Array.from(shapeSet, e => e.split(",").map(Number));
                const rotationsCache = {};
                for (let i = 0; i < this.components.length; i++) {
                    const rots = this.getRotations(this.components[i].shapeSet);
                    rotationsCache[i] = rots.map(s => shapeSetToArray(s));
                }

                const placementsByComp = Array(this.components.length).fill(null).map(() => []);
                for (let compId = 0; compId < this.components.length; compId++) {
                    const rots = rotationsCache[compId];
                    for (const shapeArr of rots) {
                        const maxDx = Math.max(...shapeArr.map(p => p[0]));
                        const maxDy = Math.max(...shapeArr.map(p => p[1]));
                        const maxR = N - maxDx;
                        const maxC = M - maxDy;
                        for (let r0 = 0; r0 < maxR; r0++) {
                            for (let c0 = 0; c0 < maxC; c0++) {
                                let ok = true;
                                const coords = [];
                                for (const [dx, dy] of shapeArr) {
                                    const rr = r0 + dx, cc = c0 + dy;
                                    if (board[rr][cc] !== 0) { ok = false; break; }
                                    coords.push([rr, cc]);
                                }
                                if (!ok) continue;

                                const rowDelta = {};
                                const colDelta = {};
                                for (const [rr, cc] of coords) {
                                    rowDelta[rr] = (rowDelta[rr] || 0) + 1;
                                    colDelta[cc] = (colDelta[cc] || 0) + 1;
                                }

                                let staticOk = true;
                                for (const rStr in rowDelta) {
                                    const r = +rStr;
                                    if (rowTargets[r] === 0 && row2Targets[r] === 0) { staticOk = false; break; }
                                }
                                if (!staticOk) continue;
                                for (const cStr in colDelta) {
                                    const c = +cStr;
                                    if (colTargets[c] === 0 && col2Targets[c] === 0) { staticOk = false; break; }
                                }
                                if (!staticOk) continue;

                                placementsByComp[compId].push({
                                    coords,
                                    rowDelta,
                                    colDelta,
                                    size: coords.length
                                });
                            }
                        }
                    }
                }

                const compAreas = this.components.map(c => c.shapeSet.size);
                const compIdsInOrder = [];
                this.components.forEach((c, i) => {
                    for (let k = 0; k < (c.count || 0); k++) compIdsInOrder.push({ compId: i, type: 1 });
                    if (this.type2Enabled) {
                        for (let k = 0; k < (c.count2 || 0); k++) compIdsInOrder.push({ compId: i, type: 2 });
                    }
                });
                compIdsInOrder.sort((a, b) => compAreas[b.compId] - compAreas[a.compId]);

                const remCap1FromIdx = new Array(compIdsInOrder.length + 1).fill(0);
                const remCap2FromIdx = new Array(compIdsInOrder.length + 1).fill(0);
                for (let i = compIdsInOrder.length - 1; i >= 0; i--) {
                    remCap1FromIdx[i] = remCap1FromIdx[i + 1] + (compIdsInOrder[i].type === 1 ? compAreas[compIdsInOrder[i].compId] : 0);
                    remCap2FromIdx[i] = remCap2FromIdx[i + 1] + (compIdsInOrder[i].type === 2 ? compAreas[compIdsInOrder[i].compId] : 0);
                }

                const canStillSatisfy = (compIndex) => {
                    for (let i = 0; i < N; i++) {
                        if (rowLitCount[i] > rowTargets[i]) return false;
                        if (rowLit2Count[i] > row2Targets[i]) return false;
                    }
                    for (let i = 0; i < M; i++) {
                        if (colLitCount[i] > colTargets[i]) return false;
                        if (colLit2Count[i] > col2Targets[i]) return false;
                    }

                    for (let i = 0; i < N; i++) {
                        const gRowRemain = rowTargets[i] - rowLitCount[i];
                        const bRowRemain = row2Targets[i] - rowLit2Count[i];
                        if (gRowRemain + bRowRemain > rowEmptyCount[i]) return false;

                    }
                    for (let i = 0; i < M; i++) {
                        const gColRemain = colTargets[i] - colLitCount[i];
                        const bColRemain = col2Targets[i] - colLit2Count[i];
                        if (gColRemain + bColRemain > colEmptyCount[i]) return false;
                    }

                    const remainG = totalNeeded - currentGreens;
                    const remainB = totalNeeded2 - currentBlues;
                    if (remainG < 0 || remainB < 0) return false;
                    const remainTotal = remainG + remainB;
                    if (remainTotal > totalEmpty) return false;

                    if (remainG > remCap1FromIdx[compIndex]) return false;
                    if (remainB > remCap2FromIdx[compIndex]) return false;

                    return true;
                };

                const boardSatisfied = () => {
                    for (let i = 0; i < N; i++) {
                        if (rowLitCount[i] !== rowTargets[i]) return false;
                        if (rowLit2Count[i] !== row2Targets[i]) return false;
                    }
                    for (let i = 0; i < M; i++) {
                        if (colLitCount[i] !== colTargets[i]) return false;
                        if (colLit2Count[i] !== col2Targets[i]) return false;
                    }
                    return true;
                };

                let compInstanceCounter = 0;
                const placePlacement = (placement, compId, ct) => {
                    for (const rStr in placement.rowDelta) {
                        const r = +rStr;
                        if (ct === 1) {
                            if (rowLitCount[r] + placement.rowDelta[r] > rowTargets[r]) return null;
                        } else {
                            if (rowLit2Count[r] + placement.rowDelta[r] > row2Targets[r]) return null;
                        }
                    }
                    for (const cStr in placement.colDelta) {
                        const c = +cStr;
                        if (ct === 1) {
                            if (colLitCount[c] + placement.colDelta[c] > colTargets[c]) return null;
                        } else {
                            if (colLit2Count[c] + placement.colDelta[c] > col2Targets[c]) return null;
                        }
                    }
                    for (const [rr, cc] of placement.coords) {
                        if (board[rr][cc] !== 0) return null;
                    }

                    const instanceId = compInstanceCounter++;
                    for (const [rr, cc] of placement.coords) {
                        board[rr][cc] = instanceId + 1;
                        if (ct === 1) {
                            rowLitCount[rr]++;
                            colLitCount[cc]++;
                            currentGreens++;
                        } else {
                            rowLit2Count[rr]++;
                            colLit2Count[cc]++;
                            currentBlues++;
                        }
                        rowEmptyCount[rr]--;
                        colEmptyCount[cc]--;
                        totalEmpty--;

                        const cell = this.cells[rr * M + cc];
                        cell.placed = true;
                        cell.compId = compId;
                        cell.compInstanceId = instanceId;
                        cell.state = (ct === 1) ? 2 : 3;
                    }
                    this.placedInstances.push({
                        instanceId,
                        compId,
                        type: ct,
                        name: this.components[compId].name,
                        coords: placement.coords.slice(),
                        color: this.components[compId].color
                    });
                    return instanceId;
                };

                const removePlacement = (placement, instanceId, ct) => {
                    for (const [rr, cc] of placement.coords) {
                        board[rr][cc] = 0;
                        if (ct === 1) {
                            rowLitCount[rr]--;
                            colLitCount[cc]--;
                            currentGreens--;
                        } else {
                            rowLit2Count[rr]--;
                            colLit2Count[cc]--;
                            currentBlues--;
                        }
                        rowEmptyCount[rr]++;
                        colEmptyCount[cc]++;
                        totalEmpty++;

                        const cell = this.cells[rr * M + cc];
                        cell.placed = false;
                        cell.compId = null;
                        cell.compInstanceId = null;
                        cell.state = 0;
                    }
                    this.placedInstances = this.placedInstances.filter(inst => inst.instanceId !== instanceId);
                };

                const tryPlacements = (compIndex) => {
                    if (boardSatisfied()) return true;
                    if (!canStillSatisfy(compIndex)) return false;
                    if (compIndex >= compIdsInOrder.length) return false;

                    const { compId, type } = compIdsInOrder[compIndex];
                    const candidates = placementsByComp[compId];

                    const sorted = candidates.slice().sort((a, b) => b.size - a.size);

                    for (const placement of sorted) {
                        let touchesSaturated = false;
                        for (const rStr in placement.rowDelta) {
                            const r = +rStr;
                            if ((type === 1 && rowLitCount[r] >= rowTargets[r]) ||
                                (type === 2 && rowLit2Count[r] >= row2Targets[r])) {
                                touchesSaturated = true; break;
                            }
                        }
                        if (!touchesSaturated) {
                            for (const cStr in placement.colDelta) {
                                const c = +cStr;
                                if ((type === 1 && colLitCount[c] >= colTargets[c]) ||
                                    (type === 2 && colLit2Count[c] >= col2Targets[c])) {
                                    touchesSaturated = true; break;
                                }
                            }
                        }
                        if (touchesSaturated) continue;

                        const iid = placePlacement(placement, compId, type);
                        if (iid !== null) {
                            if (canStillSatisfy(compIndex + 1)) {
                                if (tryPlacements(compIndex + 1)) return true;
                            }
                            removePlacement(placement, iid, type);
                        }
                    }

                    if (tryPlacements(compIndex + 1)) return true;

                    return false;
                };

                const solved = tryPlacements(0);

                if (solved) {
                    const usedInstanceIds = new Set();
                    this.cells.forEach(cell => {
                        if (cell.placed && cell.compInstanceId !== null && cell.compInstanceId !== undefined) {
                            usedInstanceIds.add(cell.compInstanceId);
                        }
                    });
                    const sortedInstanceIds = Array.from(usedInstanceIds).sort((a, b) => a - b);
                    const idMap = new Map();
                    sortedInstanceIds.forEach((oldId, idx) => idMap.set(oldId, idx + 1));
                    this.cells.forEach(cell => {
                        if (cell.placed && cell.compInstanceId !== null && cell.compInstanceId !== undefined) {
                            cell.compInstanceId = idMap.get(cell.compInstanceId);
                        }
                    });

                    this.calculateResultMessage = "成功找到一个可行解。";
                    this.answerPlaced = true;
                } else {
                    this.calculateResultMessage = "此输入内容无匹配解。";
                    this.answerPlaced = false;
                }
            } catch (e) {
                console.error(e);
                this.calculateResultMessage = "计算过程中出现异常";
                this.answerPlaced = false;
            } finally {
                this.calculateRunning = false;
            }
        },
        onType2Toggle() {
            if (this.boardGenerated && !this.type2Enabled) {
                let confirmReset = window.confirm('取消蓝色组件计算会重置全部内容，是否继续? ');
                if (confirmReset) {
                    this.resetAll();
                } else {
                    this.type2Enabled = !this.type2Enabled;
                }
            }
        },
        resetAnswer() {
            if(!this.boardGenerated) return;
            this.calculateResultMessage = "";
            this.cells.forEach(cell => {
                if(cell.placed){
                    cell.placed = false;
                    cell.compId = null;
                    cell.state = 0;
                    cell.compInstanceId = null;
                }
            });
            this.answerPlaced = false;
        },
        resetAll() {
            if(!this.boardGenerated) return;
            this.calculateResultMessage = "";
            this.answerPlaced = false;
            this.rowTargets = Array(this.boardRows).fill(0);
            this.colTargets = Array(this.boardCols).fill(0);
            this.row2Targets = Array(this.boardRows).fill(0);
            this.col2Targets = Array(this.boardCols).fill(0);
            this.components.forEach(c => {
                c.count = 0;
                c.count2 = 0;
            });
            this.cells = [];
            for (let r = 0; r < this.boardRows; r++) {
                for (let c = 0; c < this.boardCols; c++) {
                    this.cells.push({
                        r,
                        c,
                        state: 0,
                        disabled: false,
                        placed: false,
                        compId: null,
                        compInstanceId: null,
                    });
                }
            }
        },
        getRotations(shapeSet) {
            const coords = Array.from(shapeSet, s => s.split(",").map(Number));
            const normalize = (arr) => {
                let minR = Math.min(...arr.map(p => p[0]));
                let minC = Math.min(...arr.map(p => p[1]));
                return arr.map(p => [p[0] - minR, p[1] - minC]);
            };
            const toSet = arr => new Set(arr.map(p => p.join(",")));

            const rotations = [];
            let r0 = normalize(coords);
            rotations.push(toSet(r0));
            rotations.push(toSet(normalize(r0.map(p => [p[1], -p[0]]))));
            rotations.push(toSet(normalize(r0.map(p => [-p[0], -p[1]]))));
            rotations.push(toSet(normalize(r0.map(p => [-p[1], p[0]]))));

            const uniq = [];
            rotations.forEach(s => {
                if(!uniq.some(us => this.setEquals(us, s))){
                    uniq.push(s);
                }
            });
            return uniq;
        },
        setEquals(a, b) {
            if(a.size !== b.size) return false;
            for(let v of a){
                if(!b.has(v)) return false;
            }
            return true;
        },
        getCellBorderStyle(cell, idx) {
            const N = this.boardRows;
            const M = this.boardCols;
            const r = Math.floor(idx / M);
            const c = idx % M;
            const style = {
                borderTop: '2.2px solid transparent',
                borderBottom: '2.2px solid transparent',
                borderLeft: '2.2px solid transparent',
                borderRight: '2.2px solid transparent',
                borderRadius: '8px',
            };
            if (r === 0) {
                style.borderTop = '2.2px solid #333';
            } else {
                const up = this.cells[(r - 1) * M + c];
                if (!up.placed || up.compInstanceId !== cell.compInstanceId) {
                    style.borderTop = '2.2px solid #333';
                }
            }
            if (r === N -1) {
                style.borderBottom = '2.2px solid #333';
            } else {
                const down = this.cells[(r + 1) * M + c];
                if (!down.placed || down.compInstanceId !== cell.compInstanceId) {
                    style.borderBottom = '2.2px solid #333';
                }
            }
            if (c === 0) {
                style.borderLeft = '2.2px solid #333';
            } else {
                const left = this.cells[r * M + (c - 1)];
                if (!left.placed || left.compInstanceId !== cell.compInstanceId) {
                    style.borderLeft = '2.2px solid #333';
                }
            }
            if (c === M -1) {
                style.borderRight = '2.2px solid #333';
            } else {
                const right = this.cells[r * M + (c + 1)];
                if (!right.placed || right.compInstanceId !== cell.compInstanceId) {
                    style.borderRight = '2.2px solid #333';
                }
            }
            return style;
        }
    },
    mounted() {
        this.loadComponentsFromServer();
        this.loadPresetsFromServer();
        this.generateBoard();
    }
});
app.mount('#app');