// PrismVista 3D - Application Controller & UI Logic

class AppController {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new Engine3D(this.canvas);
        this.scene = new Scene();

        // Camera State
        this.camera = {
            position: new Vec3(14, 8, 16),
            target: new Vec3(1, 2, 0),
            radius: 24,
            theta: 48 * Math.PI / 180,
            phi: 28 * Math.PI / 180
        };

        this.selectedId = null;
        this.activeTool = 'select'; // 'select', 'move', 'rotate', 'scale'
        this.turntableActive = false;
        this.turntableSpeed = 0.005;

        // Mouse & Navigation state
        this.isMouseDown = false;
        this.mouseButton = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.keysDown = {};

        // Camera Bookmarks / Saved Views
        this.cameraViews = [
            { name: 'Villa Front Exterior', pos: new Vec3(12, 5, 14), target: new Vec3(2, 2, 0) },
            { name: 'Sunset Pool Terrace', pos: new Vec3(-9, 3, 9), target: new Vec3(-2, 1, 1) },
            { name: 'Interior Glass View', pos: new Vec3(5, 2.5, 1), target: new Vec3(-3, 2, -2) },
            { name: 'Top Isometric Overview', pos: new Vec3(18, 22, 18), target: new Vec3(0, 0, 0) }
        ];

        this.animatingCamera = false;
        this.cameraAnim = null;

        // FPS tracking
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;

        this.initEventListeners();
        this.bindUI();
        this.updateSceneHierarchy();
        this.updateSunPresetUI();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.updateCameraFromOrbit();
        this.loop();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    updateCameraFromOrbit() {
        const p = this.camera;
        p.position.x = p.target.x + p.radius * Math.cos(p.phi) * Math.sin(p.theta);
        p.position.y = p.target.y + p.radius * Math.sin(p.phi);
        p.position.z = p.target.z + p.radius * Math.cos(p.phi) * Math.cos(p.theta);
    }

    initEventListeners() {
        const c = this.canvas;

        c.addEventListener('contextmenu', e => e.preventDefault());

        c.addEventListener('mousedown', e => {
            this.isMouseDown = true;
            this.mouseButton = e.button;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (e.button === 0) {
                // Raycast object picking
                this.pickObject(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        c.addEventListener('mousemove', e => {
            if (!this.isMouseDown) return;
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (this.mouseButton === 0) {
                // Orbit Rotation
                this.camera.theta -= dx * 0.007;
                this.camera.phi += dy * 0.007;
                const limit = Math.PI / 2 - 0.02;
                this.camera.phi = Math.max(-limit, Math.min(limit, this.camera.phi));
                this.updateCameraFromOrbit();
            } else if (this.mouseButton === 1 || this.mouseButton === 2) {
                // Pan View
                const forward = this.camera.target.clone().sub(this.camera.position).normalize();
                const right = forward.cross(new Vec3(0, 1, 0)).normalize();
                const up = right.cross(forward).normalize();

                const panSpeed = this.camera.radius * 0.0015;
                const panOffset = right.scale(-dx * panSpeed).add(up.scale(dy * panSpeed));

                this.camera.target.add(panOffset);
                this.camera.position.add(panOffset);
            }
        });

        c.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.002 * (this.camera.radius * 0.1);
            this.camera.radius = Math.max(1.5, Math.min(200, this.camera.radius + zoomDelta));
            this.updateCameraFromOrbit();
        }, { passive: false });

        window.addEventListener('keydown', e => {
            this.keysDown[e.key.toLowerCase()] = true;

            // Delete key removes selected object
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) {
                const target = document.activeElement;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
                this.deleteSelected();
            }

            // 'F' key focuses view on selected object
            if (e.key.toLowerCase() === 'f' && this.selectedId) {
                this.focusOnSelected();
            }

            // Ctrl+D duplicates
            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                this.duplicateSelected();
            }
        });

        window.addEventListener('keyup', e => {
            this.keysDown[e.key.toLowerCase()] = false;
        });

        // Drag and Drop 3D File (.obj / .stl)
        window.addEventListener('dragover', e => e.preventDefault());
        window.addEventListener('drop', e => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.handleFileImport(e.dataTransfer.files[0]);
            }
        });
    }

    processKeyboardNavigation() {
        const speed = (this.keysDown['shift'] ? 0.35 : 0.12) * (this.camera.radius * 0.05 + 0.5);
        const forward = this.camera.target.clone().sub(this.camera.position);
        forward.y = 0; forward.normalize();
        const right = forward.cross(new Vec3(0, 1, 0)).normalize();

        let moved = false;
        const moveVec = new Vec3();

        if (this.keysDown['w']) { moveVec.add(forward.clone().scale(speed)); moved = true; }
        if (this.keysDown['s']) { moveVec.sub(forward.clone().scale(speed)); moved = true; }
        if (this.keysDown['d']) { moveVec.add(right.clone().scale(speed)); moved = true; }
        if (this.keysDown['a']) { moveVec.sub(right.clone().scale(speed)); moved = true; }
        if (this.keysDown['e']) { moveVec.y += speed; moved = true; }
        if (this.keysDown['q']) { moveVec.y -= speed; moved = true; }

        if (moved) {
            this.camera.position.add(moveVec);
            this.camera.target.add(moveVec);
        }
    }

    pickObject(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const aspect = this.canvas.width / this.canvas.height;
        const proj = Mat4.create();
        Mat4.perspective(proj, (this.engine.postProcess.fov * Math.PI) / 180, aspect, 0.1, 500.0);

        const view = Mat4.create();
        Mat4.lookAt(view, this.camera.position, this.camera.target, new Vec3(0, 1, 0));

        const vp = Mat4.create();
        Mat4.multiply(vp, proj, view);
        const invVP = Mat4.create();
        if (!Mat4.invert(invVP, vp)) return;

        const ray = Ray3.fromScreen(x, y, this.canvas.width, this.canvas.height, invVP);

        let closestDist = Infinity;
        let hitObj = null;

        for (const obj of this.scene.objects) {
            if (!obj.visible || obj.locked) continue;
            const b = obj.getTransformedBounds();
            const d = ray.intersectBox(b.min, b.max);
            if (d !== null && d < closestDist) {
                closestDist = d;
                hitObj = obj;
            }
        }

        if (hitObj) {
            this.selectObject(hitObj.id);
        }
    }

    selectObject(id) {
        this.selectedId = id;
        this.updateSceneHierarchy();
        this.updateInspectorUI();
    }

    deleteSelected() {
        if (!this.selectedId) return;
        this.scene.removeObject(this.selectedId);
        this.selectedId = null;
        this.updateSceneHierarchy();
        this.updateInspectorUI();
    }

    duplicateSelected() {
        if (!this.selectedId) return;
        const orig = this.scene.getObjectById(this.selectedId);
        if (!orig) return;
        const newObj = orig.clone('obj_' + (this.scene.nextId++));
        this.scene.objects.push(newObj);
        this.selectObject(newObj.id);
    }

    focusOnSelected() {
        if (!this.selectedId) return;
        const obj = this.scene.getObjectById(this.selectedId);
        if (!obj) return;
        this.flyCameraTo(this.camera.position, obj.position.clone(), 12);
    }

    flyCameraTo(pos, target, radius = null) {
        this.animatingCamera = true;
        const startPos = this.camera.position.clone();
        const startTarget = this.camera.target.clone();
        const startTime = performance.now();
        const duration = 750; // ms

        this.cameraAnim = {
            startPos,
            targetPos: pos.clone(),
            startTarget,
            targetTarget: target.clone(),
            startTime,
            duration,
            radius: radius || this.camera.radius
        };
    }

    bindUI() {
        // Toolbar tool switching
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeTool = btn.dataset.tool;
            });
        });

        // Add Primitive Menu Dropdown
        const addBtn = document.getElementById('addMeshBtn');
        const addMenu = document.getElementById('addMenuDropdown');
        if (addBtn && addMenu) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addMenu.classList.toggle('show');
            });
            window.addEventListener('click', () => addMenu.classList.remove('show'));

            addMenu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    this.addPrimitive(type);
                });
            });
        }

        // Import Model Button & Hidden File Input
        const importBtn = document.getElementById('importModelBtn');
        const fileInput = document.getElementById('modelFileInput');
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', e => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFileImport(e.target.files[0]);
                }
            });
        }

        // Turntable button
        const turntableBtn = document.getElementById('turntableBtn');
        if (turntableBtn) {
            turntableBtn.addEventListener('click', () => {
                this.turntableActive = !this.turntableActive;
                turntableBtn.classList.toggle('active', this.turntableActive);
            });
        }

        // Render Image Export Modal
        const renderBtn = document.getElementById('renderImageBtn');
        const renderModal = document.getElementById('renderModal');
        const closeRenderModal = document.getElementById('closeRenderModal');
        const executeRenderBtn = document.getElementById('executeRenderBtn');

        if (renderBtn && renderModal) {
            renderBtn.addEventListener('click', () => {
                renderModal.classList.add('show');
            });
            closeRenderModal.addEventListener('click', () => {
                renderModal.classList.remove('show');
            });
            executeRenderBtn.addEventListener('click', () => {
                const resSelect = document.getElementById('renderResolution').value;
                let [w, h] = [1920, 1080];
                if (resSelect === '2k') [w, h] = [2560, 1440];
                else if (resSelect === '4k') [w, h] = [3840, 2160];

                const imgData = this.engine.exportHighRes(this.scene, this.camera, w, h);
                const a = document.createElement('a');
                a.href = imgData;
                a.download = `PrismVista_Render_${Date.now()}.png`;
                a.click();
                renderModal.classList.remove('show');
            });
        }

        // Left Sidebar Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabGroup = btn.parentElement;
                tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetTab = btn.dataset.tab;
                const panel = tabGroup.closest('.panel');
                panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const content = panel.querySelector(`.tab-content[data-tab="${targetTab}"]`);
                if (content) content.classList.add('active');
            });
        });

        // Environment Controls
        this.bindSlider('sunAltSlider', 'sunAltVal', v => {
            this.engine.environment.sunAltitude = parseFloat(v);
        });
        this.bindSlider('sunAzimuthSlider', 'sunAzimuthVal', v => {
            this.engine.environment.sunAzimuth = parseFloat(v);
        });
        this.bindSlider('sunIntensitySlider', 'sunIntensityVal', v => {
            this.engine.environment.sunIntensity = parseFloat(v);
        });
        this.bindSlider('fogDensitySlider', 'fogDensityVal', v => {
            this.engine.environment.fogDensity = parseFloat(v);
        });

        // Sky Presets (Midday, Sunset, Overcast, Night)
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyEnvironmentPreset(btn.dataset.preset);
            });
        });

        // Camera & Post Controls
        this.bindSlider('cameraFovSlider', 'cameraFovVal', v => {
            this.engine.postProcess.fov = parseFloat(v);
        });
        this.bindSlider('exposureSlider', 'exposureVal', v => {
            this.engine.postProcess.exposure = parseFloat(v);
        });
        this.bindSlider('bloomSlider', 'bloomVal', v => {
            this.engine.postProcess.bloom = parseFloat(v);
        });
        this.bindSlider('contrastSlider', 'contrastVal', v => {
            this.engine.postProcess.contrast = parseFloat(v);
        });
        this.bindSlider('saturationSlider', 'saturationVal', v => {
            this.engine.postProcess.saturation = parseFloat(v);
        });

        const toneMapSelect = document.getElementById('toneMappingSelect');
        if (toneMapSelect) {
            toneMapSelect.addEventListener('change', e => {
                this.engine.postProcess.toneMapping = e.target.value;
            });
        }

        // Material Controls
        const colorPicker = document.getElementById('matColorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('input', e => {
                if (!this.selectedId) return;
                const obj = this.scene.getObjectById(this.selectedId);
                if (!obj) return;
                const hex = e.target.value;
                const r = parseInt(hex.substr(1, 2), 16) / 255;
                const g = parseInt(hex.substr(3, 2), 16) / 255;
                const b = parseInt(hex.substr(5, 2), 16) / 255;
                obj.material.color = [r, g, b];
            });
        }

        this.bindSlider('matRoughnessSlider', 'matRoughnessVal', v => {
            if (!this.selectedId) return;
            const obj = this.scene.getObjectById(this.selectedId);
            if (obj) obj.material.roughness = parseFloat(v);
        });
        this.bindSlider('matMetallicSlider', 'matMetallicVal', v => {
            if (!this.selectedId) return;
            const obj = this.scene.getObjectById(this.selectedId);
            if (obj) obj.material.metallic = parseFloat(v);
        });
        this.bindSlider('matOpacitySlider', 'matOpacityVal', v => {
            if (!this.selectedId) return;
            const obj = this.scene.getObjectById(this.selectedId);
            if (obj) obj.material.opacity = parseFloat(v);
        });

        const wireframeChk = document.getElementById('matWireframeChk');
        if (wireframeChk) {
            wireframeChk.addEventListener('change', e => {
                if (!this.selectedId) return;
                const obj = this.scene.getObjectById(this.selectedId);
                if (obj) obj.material.wireframe = e.target.checked;
            });
        }

        // Transform Controls
        ['posX', 'posY', 'posZ'].forEach(axis => {
            const input = document.getElementById(axis);
            if (input) {
                input.addEventListener('input', e => {
                    if (!this.selectedId) return;
                    const obj = this.scene.getObjectById(this.selectedId);
                    if (!obj) return;
                    const val = parseFloat(e.target.value) || 0;
                    if (axis === 'posX') obj.position.x = val;
                    if (axis === 'posY') obj.position.y = val;
                    if (axis === 'posZ') obj.position.z = val;
                });
            }
        });

        ['rotX', 'rotY', 'rotZ'].forEach(axis => {
            const input = document.getElementById(axis);
            if (input) {
                input.addEventListener('input', e => {
                    if (!this.selectedId) return;
                    const obj = this.scene.getObjectById(this.selectedId);
                    if (!obj) return;
                    const val = parseFloat(e.target.value) || 0;
                    if (axis === 'rotX') obj.rotation.x = val;
                    if (axis === 'rotY') obj.rotation.y = val;
                    if (axis === 'rotZ') obj.rotation.z = val;
                });
            }
        });

        ['scaleX', 'scaleY', 'scaleZ'].forEach(axis => {
            const input = document.getElementById(axis);
            if (input) {
                input.addEventListener('input', e => {
                    if (!this.selectedId) return;
                    const obj = this.scene.getObjectById(this.selectedId);
                    if (!obj) return;
                    const val = parseFloat(e.target.value) || 1;
                    if (axis === 'scaleX') obj.scale.x = val;
                    if (axis === 'scaleY') obj.scale.y = val;
                    if (axis === 'scaleZ') obj.scale.z = val;
                });
            }
        });

        // Add Bookmark View
        const addViewBtn = document.getElementById('addCameraViewBtn');
        if (addViewBtn) {
            addViewBtn.addEventListener('click', () => {
                const count = this.cameraViews.length + 1;
                this.cameraViews.push({
                    name: `Scene View ${count}`,
                    pos: this.camera.position.clone(),
                    target: this.camera.target.clone()
                });
                this.updateCameraViewsUI();
            });
        }
        this.updateCameraViewsUI();
    }

    bindSlider(sliderId, labelId, callback) {
        const slider = document.getElementById(sliderId);
        const label = document.getElementById(labelId);
        if (slider) {
            slider.addEventListener('input', e => {
                if (label) label.textContent = e.target.value;
                callback(e.target.value);
            });
        }
    }

    applyEnvironmentPreset(preset) {
        const env = this.engine.environment;
        if (preset === 'midday') {
            env.sunAltitude = 52;
            env.sunAzimuth = 135;
            env.sunIntensity = 1.6;
            env.fogDensity = 0.002;
        } else if (preset === 'sunset') {
            env.sunAltitude = 7;
            env.sunAzimuth = 250;
            env.sunIntensity = 2.1;
            env.fogDensity = 0.005;
        } else if (preset === 'overcast') {
            env.sunAltitude = 60;
            env.sunAzimuth = 180;
            env.sunIntensity = 0.7;
            env.fogDensity = 0.015;
        } else if (preset === 'night') {
            env.sunAltitude = 2;
            env.sunAzimuth = 0;
            env.sunIntensity = 0.1;
            env.fogDensity = 0.003;
        }
        this.updateSunPresetUI();
    }

    updateSunPresetUI() {
        const env = this.engine.environment;
        const setVal = (id, val, textId) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
            const txt = document.getElementById(textId);
            if (txt) txt.textContent = val;
        };
        setVal('sunAltSlider', env.sunAltitude, 'sunAltVal');
        setVal('sunAzimuthSlider', env.sunAzimuth, 'sunAzimuthVal');
        setVal('sunIntensitySlider', env.sunIntensity, 'sunIntensityVal');
        setVal('fogDensitySlider', env.fogDensity, 'fogDensityVal');
    }

    addPrimitive(type) {
        let geom = null;
        let name = 'New Object';
        if (type === 'box') {
            geom = GeometryFactory.createBox(2, 2, 2);
            name = 'Cube Mesh';
        } else if (type === 'sphere') {
            geom = GeometryFactory.createSphere(1.2, 24, 24);
            name = 'Sphere Mesh';
        } else if (type === 'cylinder') {
            geom = GeometryFactory.createCylinder(0.8, 2.5, 24);
            name = 'Cylinder Column';
        } else if (type === 'plane') {
            geom = GeometryFactory.createPlane(10, 10);
            name = 'Floor Slab';
        }

        if (geom) {
            const obj = this.scene.addObject(name, geom, new Material({
                color: [0.75, 0.78, 0.82],
                roughness: 0.35,
                metallic: 0.1
            }));
            obj.position.copy(this.camera.target);
            this.selectObject(obj.id);
        }
    }

    handleFileImport(file) {
        const name = file.name;
        const ext = name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        if (ext === 'obj') {
            reader.onload = e => {
                const text = e.target.result;
                const geom = OBJLoader.parse(text);
                const obj = this.scene.addObject(name.replace('.obj', ''), geom, new Material({
                    color: [0.8, 0.82, 0.85],
                    roughness: 0.4,
                    metallic: 0.2
                }));
                obj.position.copy(this.camera.target);
                this.selectObject(obj.id);
                this.focusOnSelected();
            };
            reader.readAsText(file);
        } else {
            alert('Currently supported 3D format: .obj (Wavefront OBJ)');
        }
    }

    updateSceneHierarchy() {
        const list = document.getElementById('sceneHierarchyList');
        if (!list) return;
        list.innerHTML = '';

        this.scene.objects.forEach(obj => {
            const item = document.createElement('div');
            item.className = 'scene-item' + (obj.id === this.selectedId ? ' selected' : '');

            const icon = document.createElement('span');
            icon.className = 'item-icon';
            icon.textContent = '📦';

            const title = document.createElement('span');
            title.className = 'item-name';
            title.textContent = obj.name;

            const actions = document.createElement('div');
            actions.className = 'item-actions';

            const eye = document.createElement('button');
            eye.className = 'action-icon-btn';
            eye.innerHTML = obj.visible ? '👁️' : '🙈';
            eye.title = 'Visibility';
            eye.onclick = e => {
                e.stopPropagation();
                obj.visible = !obj.visible;
                this.updateSceneHierarchy();
            };

            const del = document.createElement('button');
            del.className = 'action-icon-btn delete-btn';
            del.innerHTML = '🗑️';
            del.title = 'Delete';
            del.onclick = e => {
                e.stopPropagation();
                this.scene.removeObject(obj.id);
                if (this.selectedId === obj.id) this.selectedId = null;
                this.updateSceneHierarchy();
                this.updateInspectorUI();
            };

            actions.appendChild(eye);
            actions.appendChild(del);

            item.appendChild(icon);
            item.appendChild(title);
            item.appendChild(actions);

            item.onclick = () => this.selectObject(obj.id);
            list.appendChild(item);
        });
    }

    updateCameraViewsUI() {
        const list = document.getElementById('cameraViewsList');
        if (!list) return;
        list.innerHTML = '';

        this.cameraViews.forEach((view, idx) => {
            const card = document.createElement('div');
            card.className = 'view-card';

            const thumb = document.createElement('div');
            thumb.className = 'view-thumb';
            thumb.textContent = `CAM ${idx + 1}`;

            const label = document.createElement('div');
            label.className = 'view-label';
            label.textContent = view.name;

            card.appendChild(thumb);
            card.appendChild(label);

            card.onclick = () => {
                document.querySelectorAll('.view-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.flyCameraTo(view.pos, view.target);
            };

            list.appendChild(card);
        });
    }

    updateInspectorUI() {
        const obj = this.selectedId ? this.scene.getObjectById(this.selectedId) : null;
        const noSelMsg = document.getElementById('noSelectionNotice');
        const inspectorBody = document.getElementById('inspectorBody');

        if (!obj) {
            if (noSelMsg) noSelMsg.style.display = 'block';
            if (inspectorBody) inspectorBody.style.display = 'none';
            return;
        }

        if (noSelMsg) noSelMsg.style.display = 'none';
        if (inspectorBody) inspectorBody.style.display = 'block';

        const nameInput = document.getElementById('selectedObjName');
        if (nameInput) nameInput.value = obj.name;

        // Color
        const colorPicker = document.getElementById('matColorPicker');
        if (colorPicker) {
            const r = Math.round(obj.material.color[0] * 255).toString(16).padStart(2, '0');
            const g = Math.round(obj.material.color[1] * 255).toString(16).padStart(2, '0');
            const b = Math.round(obj.material.color[2] * 255).toString(16).padStart(2, '0');
            colorPicker.value = `#${r}${g}${b}`;
        }

        const setSliderVal = (sliderId, labelId, val) => {
            const s = document.getElementById(sliderId);
            const l = document.getElementById(labelId);
            if (s) s.value = val;
            if (l) l.textContent = Number(val).toFixed(2);
        };

        setSliderVal('matRoughnessSlider', 'matRoughnessVal', obj.material.roughness);
        setSliderVal('matMetallicSlider', 'matMetallicVal', obj.material.metallic);
        setSliderVal('matOpacitySlider', 'matOpacityVal', obj.material.opacity);

        const wireframeChk = document.getElementById('matWireframeChk');
        if (wireframeChk) wireframeChk.checked = obj.material.wireframe;

        // Transforms
        const setCoord = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = Number(val).toFixed(2);
        };
        setCoord('posX', obj.position.x);
        setCoord('posY', obj.position.y);
        setCoord('posZ', obj.position.z);

        setCoord('rotX', obj.rotation.x);
        setCoord('rotY', obj.rotation.y);
        setCoord('rotZ', obj.rotation.z);

        setCoord('scaleX', obj.scale.x);
        setCoord('scaleY', obj.scale.y);
        setCoord('scaleZ', obj.scale.z);
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        const now = performance.now();
        this.frameCount++;
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            const fpsEl = document.getElementById('fpsCounter');
            if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
        }

        // Handle WASD Walkthrough
        this.processKeyboardNavigation();

        // Turntable animation
        if (this.turntableActive) {
            this.camera.theta += this.turntableSpeed;
            this.updateCameraFromOrbit();
        }

        // Camera Smooth Glide Interpolation
        if (this.animatingCamera && this.cameraAnim) {
            const elapsed = now - this.cameraAnim.startTime;
            let progress = elapsed / this.cameraAnim.duration;
            if (progress >= 1.0) {
                progress = 1.0;
                this.animatingCamera = false;
            }
            // Smooth easeInOutQuad
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

            this.camera.position = this.cameraAnim.startPos.clone().lerp(this.cameraAnim.targetPos, ease);
            this.camera.target = this.cameraAnim.startTarget.clone().lerp(this.cameraAnim.targetTarget, ease);

            // Recompute orbit angles
            const offset = this.camera.position.clone().sub(this.camera.target);
            this.camera.radius = offset.length();
            this.camera.phi = Math.asin(offset.y / this.camera.radius);
            this.camera.theta = Math.atan2(offset.x, offset.z);
        }

        // Render Scene
        this.engine.renderScene(this.scene, this.camera, this.selectedId);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});

