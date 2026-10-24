// PrismVista 3D - Scene Graph & Geometry Generators & 3D Loaders

class Geometry {
    constructor(positions, normals, uvs, indices) {
        this.positions = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
        this.computeBounds();
    }

    computeBounds() {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < this.positions.length; i += 3) {
            const x = this.positions[i], y = this.positions[i + 1], z = this.positions[i + 2];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        this.bounds = {
            min: new Vec3(minX, minY, minZ),
            max: new Vec3(maxX, maxY, maxZ),
            size: new Vec3(maxX - minX, maxY - minY, maxZ - minZ)
        };
    }
}

class Material {
    constructor(options = {}) {
        this.color = options.color || [0.8, 0.8, 0.8];
        this.roughness = options.roughness !== undefined ? options.roughness : 0.35;
        this.metallic = options.metallic !== undefined ? options.metallic : 0.1;
        this.emissive = options.emissive || [0.0, 0.0, 0.0];
        this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
        this.wireframe = options.wireframe || false;
    }
    clone() {
        return new Material({
            color: [...this.color],
            roughness: this.roughness,
            metallic: this.metallic,
            emissive: [...this.emissive],
            opacity: this.opacity,
            wireframe: this.wireframe
        });
    }
}

class SceneObject {
    constructor(id, name, geometry, material) {
        this.id = id;
        this.name = name;
        this.geometry = geometry;
        this.material = material || new Material();
        this.position = new Vec3(0, 0, 0);
        this.rotation = new Vec3(0, 0, 0); // degrees
        this.scale = new Vec3(1, 1, 1);
        this.visible = true;
        this.locked = false;
        this.type = 'mesh';
    }

    clone(newId) {
        const obj = new SceneObject(newId, this.name + ' (Copy)', this.geometry, this.material.clone());
        obj.position.copy(this.position).add(new Vec3(1, 0, 1));
        obj.rotation.copy(this.rotation);
        obj.scale.copy(this.scale);
        return obj;
    }

    getTransformedBounds() {
        const b = this.geometry.bounds;
        const min = b.min.clone();
        min.x *= this.scale.x; min.y *= this.scale.y; min.z *= this.scale.z;
        min.add(this.position);

        const max = b.max.clone();
        max.x *= this.scale.x; max.y *= this.scale.y; max.z *= this.scale.z;
        max.add(this.position);

        return { min, max };
    }
}

// Built-in Geometry Generators
class GeometryFactory {
    static createBox(width = 1, height = 1, depth = 1) {
        const w = width / 2, h = height / 2, d = depth / 2;
        const positions = [
            // Front
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
            // Back
             w, -h, -d,  -w, -h, -d,  -w,  h, -d,   w,  h, -d,
            // Top
            -w,  h,  d,   w,  h,  d,   w,  h, -d,  -w,  h, -d,
            // Bottom
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
            // Right
             w, -h,  d,   w, -h, -d,   w,  h, -d,   w,  h,  d,
            // Left
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
        ];
        const normals = [
            0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
            0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
            0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
            0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
            1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
           -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
        ];
        const uvs = [];
        for (let i = 0; i < 6; i++) {
            uvs.push(0, 0,  1, 0,  1, 1,  0, 1);
        }
        const indices = [];
        for (let i = 0; i < 6; i++) {
            const base = i * 4;
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
        return new Geometry(positions, normals, uvs, indices);
    }

    static createSphere(radius = 1, latBands = 24, longBands = 24) {
        const positions = [], normals = [], uvs = [], indices = [];
        for (let lat = 0; lat <= latBands; lat++) {
            const theta = (lat * Math.PI) / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= longBands; lon++) {
                const phi = (lon * 2 * Math.PI) / longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(radius * x, radius * y, radius * z);
                normals.push(x, y, z);
                uvs.push(1 - (lon / longBands), 1 - (lat / latBands));
            }
        }
        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < longBands; lon++) {
                const first = lat * (longBands + 1) + lon;
                const second = first + longBands + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        return new Geometry(positions, normals, uvs, indices);
    }

    static createCylinder(radius = 0.5, height = 2, segs = 24) {
        const positions = [], normals = [], uvs = [], indices = [];
        const h2 = height / 2;

        // Side vertices
        for (let i = 0; i <= segs; i++) {
            const theta = (i * 2 * Math.PI) / segs;
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            const u = i / segs;

            positions.push(radius * cos, -h2, radius * sin);
            normals.push(cos, 0, sin);
            uvs.push(u, 0);

            positions.push(radius * cos, h2, radius * sin);
            normals.push(cos, 0, sin);
            uvs.push(u, 1);
        }

        for (let i = 0; i < segs; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
        }

        // Top & Bottom caps
        const topCenterIdx = positions.length / 3;
        positions.push(0, h2, 0); normals.push(0, 1, 0); uvs.push(0.5, 0.5);
        for (let i = 0; i <= segs; i++) {
            const theta = (i * 2 * Math.PI) / segs;
            positions.push(radius * Math.cos(theta), h2, radius * Math.sin(theta));
            normals.push(0, 1, 0);
            uvs.push(0.5 + 0.5 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta));
        }
        for (let i = 0; i < segs; i++) {
            indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 2 + i);
        }

        const botCenterIdx = positions.length / 3;
        positions.push(0, -h2, 0); normals.push(0, -1, 0); uvs.push(0.5, 0.5);
        for (let i = 0; i <= segs; i++) {
            const theta = (i * 2 * Math.PI) / segs;
            positions.push(radius * Math.cos(theta), -h2, radius * Math.sin(theta));
            normals.push(0, -1, 0);
            uvs.push(0.5 + 0.5 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta));
        }
        for (let i = 0; i < segs; i++) {
            indices.push(botCenterIdx, botCenterIdx + 2 + i, botCenterIdx + 1 + i);
        }

        return new Geometry(positions, normals, uvs, indices);
    }

    static createPlane(width = 30, depth = 30, segX = 1, segZ = 1) {
        const w2 = width / 2, d2 = depth / 2;
        const positions = [
            -w2, 0, -d2,
             w2, 0, -d2,
             w2, 0,  d2,
            -w2, 0,  d2
        ];
        const normals = [
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        ];
        const uvs = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        const indices = [0, 2, 1, 0, 3, 2];
        return new Geometry(positions, normals, uvs, indices);
    }
}

// OBJ 3D Model Parser
class OBJLoader {
    static parse(objText) {
        const lines = objText.split('\n');
        const rawPositions = [];
        const rawNormals = [];
        const rawUVs = [];

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const vertMap = new Map();

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;
            const parts = line.split(/\s+/);
            const cmd = parts[0];

            if (cmd === 'v') {
                rawPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (cmd === 'vn') {
                rawNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (cmd === 'vt') {
                rawUVs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
            } else if (cmd === 'f') {
                const faceVerts = parts.slice(1);
                // Triangulate polygons
                for (let i = 1; i < faceVerts.length - 1; i++) {
                    const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];
                    for (const vertStr of tri) {
                        let idx = vertMap.get(vertStr);
                        if (idx === undefined) {
                            const sub = vertStr.split('/');
                            const vIdx = parseInt(sub[0]) - 1;
                            const vtIdx = sub[1] ? parseInt(sub[1]) - 1 : -1;
                            const vnIdx = sub[2] ? parseInt(sub[2]) - 1 : -1;

                            const p = rawPositions[vIdx] || [0, 0, 0];
                            const n = (vnIdx >= 0 && rawNormals[vnIdx]) ? rawNormals[vnIdx] : [0, 1, 0];
                            const uv = (vtIdx >= 0 && rawUVs[vtIdx]) ? rawUVs[vtIdx] : [0, 0];

                            positions.push(p[0], p[1], p[2]);
                            normals.push(n[0], n[1], n[2]);
                            uvs.push(uv[0], uv[1]);

                            idx = (positions.length / 3) - 1;
                            vertMap.set(vertStr, idx);
                        }
                        indices.push(idx);
                    }
                }
            }
        }

        // Center model and compute bounding
        const geom = new Geometry(positions, normals, uvs, indices);
        const center = geom.bounds.min.clone().add(geom.bounds.max).scale(0.5);
        const size = geom.bounds.size;
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        const targetScale = 4.0 / maxDim; // Normalize to roughly 4 units

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = (positions[i] - center.x) * targetScale;
            positions[i + 1] = (positions[i + 1] - geom.bounds.min.y) * targetScale; // Ground on floor
            positions[i + 2] = (positions[i + 2] - center.z) * targetScale;
        }

        return new Geometry(positions, normals, uvs, indices);
    }
}

// Scene Container
class Scene {
    constructor() {
        this.objects = [];
        this.nextId = 1;
        this.initDefaultArchScene();
    }

    addObject(name, geometry, material) {
        const id = 'obj_' + (this.nextId++);
        const obj = new SceneObject(id, name, geometry, material);
        this.objects.push(obj);
        return obj;
    }

    getObjectById(id) {
        return this.objects.find(o => o.id === id);
    }

    removeObject(id) {
        const idx = this.objects.findIndex(o => o.id === id);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            return true;
        }
        return false;
    }

    initDefaultArchScene() {
        this.objects = [];

        // 1. Ground Plane (Polished Concrete / Yard)
        const ground = this.addObject('Ground Terrace', GeometryFactory.createPlane(60, 60), new Material({
            color: [0.38, 0.40, 0.42],
            roughness: 0.65,
            metallic: 0.05
        }));
        ground.position.set(0, 0, 0);

        // 2. Infinity Pool Deck (Teak Wood Planks)
        const deck = this.addObject('Teak Wood Deck', GeometryFactory.createBox(22, 0.4, 14), new Material({
            color: [0.42, 0.28, 0.18],
            roughness: 0.45,
            metallic: 0.02
        }));
        deck.position.set(0, 0.2, 0);

        // 3. Pool Water Body (Reflective Blue)
        const water = this.addObject('Infinity Pool', GeometryFactory.createBox(10, 0.35, 6), new Material({
            color: [0.12, 0.65, 0.85],
            roughness: 0.04,
            metallic: 0.85,
            opacity: 0.85
        }));
        water.position.set(-4, 0.25, 2.5);

        // 4. Modern Architectural Villa - Main Floor Slab
        const slab = this.addObject('Villa Cantilever Roof', GeometryFactory.createBox(16, 0.5, 10), new Material({
            color: [0.92, 0.92, 0.94],
            roughness: 0.25,
            metallic: 0.1
        }));
        slab.position.set(2, 4.2, -1);

        // 5. Villa Foundation Wall (Dark Charcoal Concrete)
        const backWall = this.addObject('Villa Stone Wall', GeometryFactory.createBox(14, 3.8, 0.6), new Material({
            color: [0.22, 0.24, 0.26],
            roughness: 0.8,
            metallic: 0.1
        }));
        backWall.position.set(2, 2.1, -5.5);

        // 6. Floor-to-Ceiling Panoramic Glass Wall
        const glass = this.addObject('Curtain Glass Facade', GeometryFactory.createBox(13.8, 3.6, 0.15), new Material({
            color: [0.65, 0.85, 0.95],
            roughness: 0.05,
            metallic: 0.95,
            opacity: 0.45
        }));
        glass.position.set(2, 2.2, 3.2);

        // 7. Structural Black Steel Pillars
        for (let i = 0; i < 3; i++) {
            const col = this.addObject(`Steel Pillar ${i + 1}`, GeometryFactory.createCylinder(0.18, 3.8, 16), new Material({
                color: [0.1, 0.1, 0.12],
                roughness: 0.3,
                metallic: 0.85
            }));
            col.position.set(-3 + i * 5, 2.1, 3.3);
        }

        // 8. Sculptural Sphere (Bronze Architectural Art Feature)
        const sphere = this.addObject('Sculptural Bronze Sphere', GeometryFactory.createSphere(1.2, 32, 32), new Material({
            color: [0.85, 0.55, 0.25],
            roughness: 0.15,
            metallic: 0.92
        }));
        sphere.position.set(6, 1.4, 2);

        // 9. Modern Lounge Daybed
        const daybed = this.addObject('Lounge Sunbed', GeometryFactory.createBox(3.2, 0.45, 1.4), new Material({
            color: [0.88, 0.88, 0.85],
            roughness: 0.5,
            metallic: 0.05
        }));
        daybed.position.set(3, 0.65, -1.5);
        daybed.rotation.set(0, -25, 0);

        // 10. Architectural Emissive Strip Light (Warm LED)
        const lightStrip = this.addObject('Recessed LED Light Strip', GeometryFactory.createBox(13.5, 0.1, 0.2), new Material({
            color: [1.0, 0.92, 0.7],
            roughness: 0.1,
            metallic: 0.0,
            emissive: [1.2, 1.0, 0.6]
        }));
        lightStrip.position.set(2, 3.9, 3.1);
    }
}

